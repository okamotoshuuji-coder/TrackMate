// ======================================
// TrackMate Ver2.3
// ======================================

// ---------- データ ----------
let xp = Number(localStorage.getItem("xp")) || 0;
let level = Number(localStorage.getItem("level")) || 1;
let records = JSON.parse(localStorage.getItem("records")) || [];
let growthChart = null;

// ---------- 要素 ----------
const pages = document.querySelectorAll(".page");

const resetBtn = document.getElementById("resetBtn");

const levelText = document.getElementById("level");
const xpBar = document.getElementById("xpBar");

const saveRecordBtn = document.getElementById("saveRecord");
const eventSelect = document.getElementById("event");
const timeInput = document.getElementById("time");
const memoInput = document.getElementById("memo");
const recordsDiv = document.getElementById("records");

const coachText = document.getElementById("coachText");

// ======================================
// ページ切り替え
// ======================================
function showPage(pageId) {
    pages.forEach(page => page.classList.remove("active"));

    const page = document.getElementById(pageId);
    if (page) page.classList.add("active");

    if (pageId === "graphPage") {
        drawGraph();
        updateBestTime();
    }
}

// ======================================
// XP・レベル
// ======================================
function updateXP() {
    levelText.textContent = level;
    xpBar.style.width = xp + "%";

    localStorage.setItem("xp", xp);
    localStorage.setItem("level", level);
}

function addXP(amount) {
    xp += amount;

    while (xp >= 100) {
        xp -= 100;
        level++;
        alert("レベルアップ！ Lv." + level);
    }

    updateXP();
}

// ======================================
// タイム変換
// ======================================
function timeToSeconds(time) {
    if (!time || !time.includes(":")) return NaN;

    const parts = time.split(":");
    if (parts.length !== 2) return NaN;

    const min = Number(parts[0]);
    const sec = Number(parts[1]);

    if (
        !Number.isFinite(min) ||
        !Number.isFinite(sec) ||
        min < 0 ||
        sec < 0 ||
        sec >= 60
    ) {
        return NaN;
    }

    return min * 60 + sec;
}

function secondsToTime(total) {
    if (!Number.isFinite(total)) return "-";

    let min = Math.floor(total / 60);
    let sec = Math.round(total % 60);

    if (sec === 60) {
        min++;
        sec = 0;
    }

    return min + ":" + String(sec).padStart(2, "0");
}

// ======================================
// PBを再計算
// ======================================
function recalculatePB(eventName) {
    const eventRecords = records.filter(
        record => record.event === eventName
    );

    const key = "pb_" + eventName;

    if (eventRecords.length === 0) {
        localStorage.removeItem(key);
        return;
    }

    let best = eventRecords[0];

    eventRecords.forEach(record => {
        if (
            timeToSeconds(record.time) <
            timeToSeconds(best.time)
        ) {
            best = record;
        }
    });

    localStorage.setItem(key, best.time);
}

// ======================================
// 記録一覧
// ======================================
function displayRecords() {
    recordsDiv.innerHTML = "";

    if (records.length === 0) {
        const message = document.createElement("p");
        message.textContent = "まだ記録はありません";
        recordsDiv.appendChild(message);
        return;
    }

    records.forEach((record, index) => {
        const item = document.createElement("div");
        item.className = "record-item";

        const title = document.createElement("h3");
        title.textContent = record.event;

        const time = document.createElement("p");
        time.textContent = "⏱ " + record.time;

        const memo = document.createElement("p");
        memo.textContent = record.memo || "メモなし";

        const date = document.createElement("small");
        date.textContent = record.date;

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "この記録を削除";
        deleteBtn.style.marginTop = "10px";
        deleteBtn.style.background = "#555";

        deleteBtn.addEventListener("click", () => {
            if (!confirm("この記録を削除しますか？")) return;

            const deletedEvent = records[index].event;
            records.splice(index, 1);

            localStorage.setItem("records", JSON.stringify(records));

            recalculatePB(deletedEvent);
            displayRecords();
            drawGraph();
            updateBestTime();
        });

        item.appendChild(title);
        item.appendChild(time);
        item.appendChild(memo);
        item.appendChild(date);
        item.appendChild(deleteBtn);

        recordsDiv.appendChild(item);
    });
}

// ======================================
// PB判定
// ======================================
function checkPB(eventName, time) {
    const key = "pb_" + eventName;
    const oldPB = localStorage.getItem(key);

    if (!oldPB) {
        localStorage.setItem(key, time);
        alert("初めての記録を保存しました！");
        addXP(20);
        return;
    }

    if (timeToSeconds(time) < timeToSeconds(oldPB)) {
        localStorage.setItem(key, time);

        alert(
            "🎉 NEW PB!!\n\n" +
            eventName + "\n" +
            oldPB + " → " + time + "\n\n" +
            "+50XP"
        );

        addXP(50);
    } else {
        addXP(10);
    }
}

// ======================================
// 記録保存
// ======================================
saveRecordBtn.addEventListener("click", () => {
    const eventName = eventSelect.value;
    const time = timeInput.value.trim();
    const memo = memoInput.value.trim();

    if (!time) {
        alert("タイムを入力してください！");
        return;
    }

    if (!Number.isFinite(timeToSeconds(time))) {
        alert("タイムは 5:16 のように入力してください！");
        return;
    }

    const today = new Date();
    const date =
        today.getFullYear() + "/" +
        (today.getMonth() + 1) + "/" +
        today.getDate();

    records.unshift({
        event: eventName,
        time: time,
        memo: memo,
        date: date
    });

    localStorage.setItem("records", JSON.stringify(records));

    checkPB(eventName, time);
    displayRecords();
    drawGraph();
    updateBestTime();

    timeInput.value = "";
    memoInput.value = "";
});

// ======================================
// グラフ用 Chart.js 読み込み
// ======================================
function loadChartJS(callback) {
    if (typeof Chart !== "undefined") {
        callback();
        return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = callback;
    script.onerror = () => {
        console.log("グラフの読み込みに失敗しました");
    };

    document.head.appendChild(script);
}

// ======================================
// 成長グラフ（1500m）
// ======================================
function drawGraph() {
    const canvas = document.getElementById("graphCanvas");
    if (!canvas) return;

    loadChartJS(() => {
        const list = records
            .filter(record => record.event === "1500m")
            .slice()
            .reverse();

        const labels = list.map((record, index) => {
            return (index + 1) + "回目";
        });

        const data = list.map(record => {
            return timeToSeconds(record.time);
        });

        if (growthChart) {
            growthChart.destroy();
        }

        growthChart = new Chart(canvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "1500m",
                    data: data,
                    borderColor: "#ff7a00",
                    backgroundColor: "#ff7a00",
                    pointRadius: 5,
                    tension: 0.25,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: "white" }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return "タイム：" +
                                    secondsToTime(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: "#dddddd" },
                        grid: {
                            color: "rgba(255,255,255,.08)"
                        }
                    },
                    y: {
                        reverse: true,
                        ticks: {
                            color: "#dddddd",
                            callback: value => secondsToTime(value)
                        },
                        grid: {
                            color: "rgba(255,255,255,.08)"
                        }
                    }
                }
            }
        });
    });
}

// ======================================
// 自己ベスト表示
// ======================================
function updateBestTime() {
    const bestTime = document.getElementById("bestTime");
    if (!bestTime) return;

    const pb = localStorage.getItem("pb_1500m");

    bestTime.textContent = pb
        ? "1500m " + pb
        : "1500m 記録なし";
}
// ======================================
// ペース計算
// ======================================
const calcPaceBtn = document.getElementById("calcPace");

if (calcPaceBtn) {
    calcPaceBtn.addEventListener("click", () => {
        const goalTimeInput = document.getElementById("goalTime");
        const goalSeconds = timeToSeconds(goalTimeInput.value.trim());

        if (!Number.isFinite(goalSeconds)) {
            alert("目標タイムを 5:00 のように入力してください！");
            return;
        }

        const pace400 = document.getElementById("pace400");
        const pace800 = document.getElementById("pace800");
        const pace1000 = document.getElementById("pace1000");
        const pace1200 = document.getElementById("pace1200");

        if (pace400) pace400.textContent = secondsToTime(goalSeconds * 400 / 1500);
        if (pace800) pace800.textContent = secondsToTime(goalSeconds * 800 / 1500);
        if (pace1000) pace1000.textContent = secondsToTime(goalSeconds * 1000 / 1500);
        if (pace1200) pace1200.textContent = secondsToTime(goalSeconds * 1200 / 1500);
    });
}

// ======================================
// AIコーチ
// ======================================
function updateCoach() {
    if (!coachText) return;

    const messages = [
        "今日も一歩ずつ成長しよう！焦らず継続が大切。",
        "練習後は水分補給と食事、睡眠も大切にしよう！",
        "自己ベスト更新を目指して、フォームを意識して走ろう！",
        "疲れが強い日は無理せず休むことも練習の一部だよ。",
        "レースでは前半を落ち着いて入り、後半まで力を残そう！"
    ];

    const index = Math.floor(Math.random() * messages.length);
    coachText.textContent = messages[index];
}

// ======================================
// 目標日までのカウントダウン
// ======================================
function updateCountdown() {
    const countdown = document.getElementById("countdown");
    if (!countdown) return;

    const targetDate = new Date("2026-11-15T00:00:00");
    const today = new Date();
    const difference = targetDate - today;
    const days = Math.ceil(difference / (1000 * 60 * 60 * 24));

    if (days > 0) {
        countdown.textContent = "新人戦まであと " + days + " 日！";
    } else if (days === 0) {
        countdown.textContent = "今日は新人戦！全力を出そう！";
    } else {
        countdown.textContent = "次の目標に向けて頑張ろう！";
    }
}

// ======================================
// ナビゲーション
// ======================================
document.querySelectorAll(".bottom-nav button").forEach(button => {
    button.addEventListener("click", () => {
        const pageName = button.dataset.page;

        if (!pageName) return;

        showPage(pageName);

        document.querySelectorAll(".bottom-nav button").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");
    });
});

// ======================================
// ホームから記録画面へ
// ======================================
const goRecordBtn = document.getElementById("goRecordBtn");

if (goRecordBtn) {
    goRecordBtn.addEventListener("click", () => {
        showPage("recordPage");
    });
}

// ======================================
// データリセット
// ======================================
if (resetBtn) {
    resetBtn.addEventListener("click", () => {
        if (!confirm("記録・レベルなどのデータをすべて削除しますか？")) {
            return;
        }

        const keys = [
            "records",
            "xp",
            "level",
            "pb_1500m",
            "pb_100m",
            "pb_400m",
            "pb_800m",
            "pb_3000m"
        ];

        keys.forEach(key => localStorage.removeItem(key));

        records = [];
        xp = 0;
        level = 1;

        updateXP();
        displayRecords();
        drawGraph();
        updateBestTime();

        alert("データをリセットしました！");
        showPage("homePage");
    });
}

// ======================================
// 起動時の処理
// ======================================
function startTrackMate() {
    localStorage.removeItem("loginName");
    localStorage.removeItem("loginPassword");
    localStorage.removeItem("username");

    displayRecords();
    updateXP();
    updateBestTime();
    updateCoach();
    updateCountdown();
}

startTrackMate();

console.log("🏃 TrackMate Ver2.3 起動！");