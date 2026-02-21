package telemetry

import (
	"fmt"
	"honor-root-toolkit/internal/adb"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type RAMInfo struct {
	Used    string  `json:"used"`
	Total   string  `json:"total"`
	Percent float64 `json:"percent"`
}

type StorageInfo struct {
	Used    string `json:"used"`
	Total   string `json:"total"`
	Free    string `json:"free"`
	Percent int    `json:"percent"`
}

type TelemetryData struct {
	Model     string      `json:"model"`
	CPU       float64     `json:"cpu"`
	RAM       RAMInfo     `json:"ram"`
	Battery   int         `json:"battery"`
	Temp      string      `json:"temp"`
	Storage   StorageInfo `json:"storage"`
	Rooted    bool        `json:"rooted"`
	Timestamp string      `json:"timestamp"`
}

func GetStats() (TelemetryData, error) {
	devices, err := adb.GetDevices()
	if err != nil || len(devices) == 0 {
		return TelemetryData{}, fmt.Errorf("no devices")
	}

	manufacturer, _ := adb.GetProp("ro.product.manufacturer")
	model, _ := adb.GetProp("ro.product.model")

	// RAM
	memInfo, _ := adb.Run("shell", "cat /proc/meminfo")
	ram := RAMInfo{}
	reTotal := regexp.MustCompile(`MemTotal:\s+(\d+)`)
	reAvail := regexp.MustCompile(`MemAvailable:\s+(\d+)`)

	mTotal := reTotal.FindStringSubmatch(memInfo)
	mAvail := reAvail.FindStringSubmatch(memInfo)

	if len(mTotal) > 1 && len(mAvail) > 1 {
		total, _ := strconv.Atoi(mTotal[1])
		avail, _ := strconv.Atoi(mAvail[1])
		used := total - avail
		ram.Total = fmt.Sprintf("%.1f", float64(total)/1024/1024)
		ram.Used = fmt.Sprintf("%.1f", float64(used)/1024/1024)
		ram.Percent = (float64(used) / float64(total)) * 100
	}

	// CPU
	cpu1, _ := adb.Run("shell", "cat /proc/stat | grep 'cpu '")
	time.Sleep(150 * time.Millisecond)
	cpu2, _ := adb.Run("shell", "cat /proc/stat | grep 'cpu '")

	cpuUsage := calculateCPU(cpu1, cpu2)

	// Battery
	battInfo, _ := adb.Run("shell", "dumpsys battery")
	level := 0
	temp := "0"
	reLevel := regexp.MustCompile(`level:\s+(\d+)`)
	reTemp := regexp.MustCompile(`temperature:\s+(\d+)`)

	if m := reLevel.FindStringSubmatch(battInfo); len(m) > 1 {
		level, _ = strconv.Atoi(m[1])
	}
	if m := reTemp.FindStringSubmatch(battInfo); len(m) > 1 {
		t, _ := strconv.Atoi(m[1])
		temp = fmt.Sprintf("%.1f", float64(t)/10)
	}

	// Storage
	storageInfo, _ := adb.Run("shell", "df -h /data")
	storage := StorageInfo{Total: "N/A", Used: "N/A", Free: "N/A", Percent: 0}
	lines := strings.Split(storageInfo, "\n")
	for _, line := range lines {
		if strings.Contains(line, "/data") {
			fields := strings.Fields(line)
			if len(fields) >= 5 {
				storage.Total = fields[1]
				storage.Used = fields[2]
				storage.Free = fields[3]
				pct, _ := strconv.Atoi(strings.TrimSuffix(fields[4], "%"))
				storage.Percent = pct
			}
		}
	}

	return TelemetryData{
		Model:     manufacturer + " " + model,
		CPU:       cpuUsage,
		RAM:       ram,
		Battery:   level,
		Temp:      temp,
		Storage:   storage,
		Rooted:    adb.CheckRoot(),
		Timestamp: time.Now().Format(time.RFC3339),
	}, nil
}

func calculateCPU(s1, s2 string) float64 {
	p := func(s string) []int {
		fields := strings.Fields(s)
		if len(fields) < 8 {
			return make([]int, 7)
		}
		fields = fields[1:8]
		res := make([]int, len(fields))
		for i, f := range fields {
			res[i], _ = strconv.Atoi(f)
		}
		return res
	}
	t1 := p(s1)
	t2 := p(s2)
	idle := t2[3] - t1[3]
	total := 0
	for i := 0; i < len(t1); i++ {
		total += t2[i] - t1[i]
	}
	if total == 0 {
		return 0
	}
	return (1.0 - float64(idle)/float64(total)) * 100
}
