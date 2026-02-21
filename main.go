package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"honor-root-toolkit/internal/adb"
	"honor-root-toolkit/internal/telemetry"

	"strings" // Added for command parsing

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func main() {
	// Puerto por defecto 3001
	port := "3001"
	if len(os.Args) > 1 {
		port = os.Args[1]
	}

	// Rutas estáticas para el dashboard (basado en la estructura del proyecto)
	projectRoot, _ := os.Getwd()
	staticDir := filepath.Join(projectRoot, "src", "dashboard", "public")

	// Verificar si existe el directorio
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		log.Printf("Warning: Static dir %s not found. Current dir: %s", staticDir, projectRoot)
	}

	// Servir archivos estáticos
	fs := http.FileServer(http.Dir(staticDir))
	http.Handle("/", fs)

	// Endpoint de WebSocket para telemetría
	http.HandleFunc("/ws", handleWebSocket)

	// API de salud
	http.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "OK - Honor Root Toolkit Go Engine v2.0")
	})

	fmt.Printf("🚀 Toolkit Backend (Go) iniciado en http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrade:", err)
		return
	}
	defer conn.Close()

	// Estado de la terminal por conexión
	cwd := "/"

	// Goroutine para leer comandos del cliente
	go func() {
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				return
			}

			var req map[string]string
			if err := json.Unmarshal(message, &req); err != nil {
				continue
			}

			typeStr := req["type"]
			cmd := req["command"]

			var response map[string]interface{}
			switch typeStr {
			case "terminal":
				// Lógica de CD persistente reforzada
				if strings.HasPrefix(cmd, "cd ") || cmd == "cd" {
					target := "/"
					if len(cmd) > 3 {
						target = strings.TrimSpace(cmd[3:])
					}
					// Intentar cambiar. Usamos su -c si es posible para asegurar acceso
					out, _ := adb.Run("shell", fmt.Sprintf("cd %s && cd %s && pwd", cwd, target))
					cleanPath := strings.TrimSpace(out)
					if cleanPath != "" && !strings.Contains(cleanPath, "error") {
						cwd = cleanPath
						response = map[string]interface{}{"type": "terminal", "output": fmt.Sprintf("[SYSTEM] Working directory: %s", cwd), "cwd": cwd}
					} else {
						// Si falla, intentar sin el prefijo cwd (path absoluto)
						out, _ = adb.Run("shell", fmt.Sprintf("cd %s && pwd", target))
						cleanPath = strings.TrimSpace(out)
						if cleanPath != "" && !strings.Contains(cleanPath, "error") {
							cwd = cleanPath
							response = map[string]interface{}{"type": "terminal", "output": fmt.Sprintf("[SYSTEM] Working directory (abs): %s", cwd), "cwd": cwd}
						} else {
							response = map[string]interface{}{"type": "terminal", "output": "cd: acceso denegado o path inválido", "cwd": cwd}
						}
					}
				} else {
					// Ejecutar en el contexto del CWD con prefijo de error capturado
					out, err := adb.Run("shell", fmt.Sprintf("cd %s && %s", cwd, cmd))
					resp := out
					if err != nil && out == "" {
						resp = "Error: " + err.Error()
					}
					response = map[string]interface{}{"type": "terminal", "output": resp, "cwd": cwd}
				}
			case "files":
				path := cmd
				if path == "" {
					path = "/"
				}
				files, err := adb.ListFiles(path)
				if err != nil {
					response = map[string]interface{}{"type": "files", "error": err.Error()}
				} else {
					response = map[string]interface{}{"type": "files", "files": files, "path": path}
				}
			case "fastboot":
				out, err := adb.RunFastboot(strings.Fields(cmd)...)
				resp := out
				if err != nil {
					resp = err.Error()
				}
				response = map[string]interface{}{"type": "terminal", "output": "[FASTBOOT] " + resp}
			case "modules":
				out, _ := adb.ListModules()
				response = map[string]interface{}{"type": "modules", "output": out}
			case "security":
				audit := adb.RunSecurityAudit()
				response = map[string]interface{}{"type": "security", "output": audit}
			case "perf_hack":
				out, _ := adb.ApplyPerformanceHack()
				response = map[string]interface{}{"type": "perf_hack", "output": out}
			}

			if response != nil {
				msg, _ := json.Marshal(response)
				conn.WriteMessage(websocket.TextMessage, msg)
			}
		}
	}()

	// Loop principal de telemetría (mismo de antes)
	for {
		data, err := telemetry.GetStats()
		// ... resto del loop enviando telemetría periódica

		// Si no hay dispositivo, enviar mock
		payload := make(map[string]interface{})
		if err != nil {
			mock := generateMockData(err.Error())
			template, _ := json.Marshal(mock)
			json.Unmarshal(template, &payload)
			payload["isMock"] = true
			payload["error"] = err.Error()
		} else {
			template, _ := json.Marshal(data)
			json.Unmarshal(template, &payload)
			payload["isMock"] = false
		}

		msg, _ := json.Marshal(payload)
		if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}

		time.Sleep(2 * time.Second)
	}
}

func generateMockData(errType string) telemetry.TelemetryData {
	return telemetry.TelemetryData{
		Model: "SIMULATED DEVICE (GO v2.0)",
		CPU:   15.4,
		RAM: telemetry.RAMInfo{
			Used:    "2.8",
			Total:   "16.0",
			Percent: 17.5,
		},
		Battery: 85,
		Temp:    "38.5",
		Storage: telemetry.StorageInfo{
			Used:    "45GB",
			Total:   "256GB",
			Percent: 18,
		},
		Rooted:    false,
		Timestamp: time.Now().Format(time.RFC3339),
	}
}
