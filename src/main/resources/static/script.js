const API_URL = "/api/activities";
let activities = [];
let categoryChartInstance = null; // Holds the Chart.js instance

// ======================================
// 1. PAGE NAVIGATION
// ======================================
const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

navButtons.forEach(button => {
    button.addEventListener("click", () => {
        const pageId = button.dataset.page;
        pages.forEach(page => page.classList.toggle("active-page", page.id === pageId));
        navButtons.forEach(nav => nav.classList.toggle("active", nav === button));
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});

function setTodayDate() {
    const dateInput = document.getElementById("activityDate");
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
    const dateDisplay = document.getElementById("currentDate");
    if (dateDisplay) {
        dateDisplay.textContent = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
}

// ======================================
// 2. DARK MODE TOGGLE
// ======================================
const themeToggle = document.getElementById("themeToggle");
const currentTheme = localStorage.getItem("growmateTheme");

if (currentTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("growmateTheme", isDark ? "dark" : "light");
    if(categoryChartInstance) updateChart(); // Redraw chart colors
});

// ======================================
// 3. LOAD DATA FROM BACKEND & RENDER
// ======================================
async function loadActivities() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Unable to load activities");
        activities = await response.json();
        
        renderActivities();
        updateDashboard();
        renderWeeklyPlanner();
        updateChart();
        updateGamification();
    } catch (error) {
        console.error("Loading error:", error);
        document.getElementById("activityList").innerHTML = '<p class="empty-message">Unable to load activities. Please check your server.</p>';
    }
}

// ======================================
// 4. GAMIFICATION (PLANT GROWTH XP)
// ======================================
function updateGamification() {
    const completedTasks = activities.filter(a => a.completed).length;
    const savedGoals = JSON.parse(localStorage.getItem("growmateGoals")) || [];
    const completedGoals = savedGoals.filter(g => g.completed).length;
    
    // Calculate XP: 10 per activity, 5 per goal
    const xp = (completedTasks * 10) + (completedGoals * 5);
    document.getElementById("growthXp").textContent = xp;
    
    const emojiElement = document.getElementById("plantEmoji");
    const titleElement = document.getElementById("plantStage");
    const statusElement = document.getElementById("growthStatus");

    if (xp < 30) {
        emojiElement.textContent = "🌱"; titleElement.textContent = "🌱";
        statusElement.textContent = "(Planting the seeds...)";
    } else if (xp < 100) {
        emojiElement.textContent = "🌿"; titleElement.textContent = "🌿";
        statusElement.textContent = "(Your habits are sprouting!)";
    } else {
        emojiElement.textContent = "🌳"; titleElement.textContent = "🌳";
        statusElement.textContent = "(You've grown a strong tree!)";
    }
}

// ======================================
// 5. DASHBOARD STATS
// ======================================
function updateDashboard() {
    const total = activities.length;
    const completed = activities.filter(a => a.completed).length;
    const pending = total - completed;

    document.getElementById("total").textContent = total;
    document.getElementById("completed").textContent = completed;
    document.getElementById("pending").textContent = pending;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById("progressPercent").textContent = percentage + "%";
    document.getElementById("progressBar").style.width = percentage + "%";

    const message = document.getElementById("progressMessage");
    if (total === 0) message.textContent = "Start adding activities to track your progress.";
    else if (percentage === 100) message.textContent = "Amazing! You completed all your activities! 🎉";
    else if (percentage >= 50) message.textContent = "Great progress! Keep moving forward.";
    else message.textContent = "Every small step brings you closer to your goals.";
}

// ======================================
// 6. CHART.JS ANALYTICS
// ======================================
function updateChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Calculate minutes per category
    const categoryData = { "Study": 0, "Fitness": 0, "Hobby": 0, "Personal Growth": 0, "Self-care": 0 };
    activities.forEach(act => {
        if(categoryData[act.category] !== undefined) categoryData[act.category] += act.duration;
    });

    const isDark = document.body.classList.contains("dark-mode");
    const textColor = isDark ? "#e0e0e0" : "#28263a";

    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                data: Object.values(categoryData),
                backgroundColor: ['#7257d9', '#299b70', '#e99a42', '#d45b65', '#45b6fe'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: textColor, font: { size: 11, family: 'Inter' } } }
            }
        }
    });
}

// ======================================
// 7. LIST VIEW & FILTERS
// ======================================
function renderActivities() {
    const activityList = document.getElementById("activityList");
    const searchText = document.getElementById("searchActivity").value.toLowerCase().trim();
    const selectedCategory = document.getElementById("filterCategory").value;
    const selectedStatus = document.getElementById("filterStatus").value;

    const filtered = activities.filter(activity => {
        const matchesSearch = activity.title.toLowerCase().includes(searchText);
        const matchesCategory = selectedCategory === "All" || activity.category === selectedCategory;
        const matchesStatus = selectedStatus === "All" || 
            (selectedStatus === "Completed" && activity.completed) || 
            (selectedStatus === "Pending" && !activity.completed);
        return matchesSearch && matchesCategory && matchesStatus;
    });

    activityList.innerHTML = "";
    if (filtered.length === 0) {
        activityList.innerHTML = '<p class="empty-message">No activities found. Add a new activity! 🌱</p>';
        return;
    }

    filtered.forEach(activity => {
        const card = document.createElement("div");
        card.className = "activity-card";
        card.innerHTML = `
            <div>
                <h3>${escapeHTML(activity.title)}</h3>
                <p>${escapeHTML(activity.category)} • ${activity.duration} min</p>
            </div>
            <div class="activity-actions">
                <button class="complete-btn">${activity.completed ? "Mark Pending" : "Complete"}</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        card.querySelector(".complete-btn").addEventListener("click", () => toggleActivity(activity));
        card.querySelector(".delete-btn").addEventListener("click", () => deleteActivity(activity.id));
        activityList.appendChild(card);
    });
}

// Event Listeners for Filters
document.getElementById("searchActivity").addEventListener("input", renderActivities);
document.getElementById("filterCategory").addEventListener("change", renderActivities);
document.getElementById("filterStatus").addEventListener("change", renderActivities);

// ======================================
// 8. ADD, TOGGLE, DELETE LOGIC (API)
// ======================================
document.getElementById("activityForm").addEventListener("submit", async event => {
    event.preventDefault();
    const newActivity = {
        title: document.getElementById("activityName").value.trim(),
        category: document.getElementById("category").value,
        date: document.getElementById("activityDate").value,
        duration: Number(document.getElementById("duration").value),
        completed: false
    };

    try {
        const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newActivity) });
        if (!res.ok) throw new Error("Could not add");
        document.getElementById("activityForm").reset();
        setTodayDate();
        await loadActivities();
    } catch (e) { alert("Unable to add activity."); }
});

async function toggleActivity(activity) {
    const updated = { ...activity, completed: !activity.completed };
    try {
        const res = await fetch(`${API_URL}/${activity.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
        if (!res.ok) throw new Error("Update failed");
        await loadActivities();
    } catch (e) { alert("Could not update activity."); }
}

async function deleteActivity(id) {
    if (!confirm("Delete this activity?")) return;
    try {
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        await loadActivities();
    } catch (e) { alert("Unable to delete."); }
}


// ======================================
// 9. WEEKLY PLANNER
// ======================================
function renderWeeklyPlanner() {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0,0,0,0);
    
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    document.getElementById("weekRange").textContent = `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

    document.querySelectorAll(".week-day-content").forEach(el => el.innerHTML = "");

    activities.forEach(activity => {
        const activityDate = new Date(activity.date + "T00:00:00");
        const diff = Math.round((activityDate - monday) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 6) {
            const dayElement = document.querySelector(`.week-day[data-day="${days[diff]}"] .week-day-content`);
            if (dayElement) {
                dayElement.innerHTML += `<div class="week-activity"><strong>${escapeHTML(activity.title)}</strong><span class="muted">${activity.completed ? "✓ Done" : "⏳ Pend"}</span></div>`;
            }
        }
    });
}

// ======================================
// 10. FOCUS TIMER
// ======================================
let timerSeconds = 25 * 60, selectedMinutes = 25, timerInterval = null, timerRunning = false;
const timerDisplay = document.getElementById("timerDisplay"), timerMode = document.getElementById("timerMode");
const startTimerBtn = document.getElementById("startTimer"), timerCircle = document.getElementById("timerCircle");

function updateTimerDisplay() {
    timerDisplay.textContent = String(Math.floor(timerSeconds / 60)).padStart(2, "0") + ":" + String(timerSeconds % 60).padStart(2, "0");
}

function stopTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    startTimerBtn.textContent = "Start Focus";
    timerCircle.classList.remove("running");
}

function startTimer() {
    if (timerRunning) return stopTimer();
    if (timerSeconds <= 0) timerSeconds = selectedMinutes * 60;
    
    timerRunning = true;
    startTimerBtn.textContent = "Pause";
    timerCircle.classList.add("running"); // Starts CSS Pulse animation

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
            stopTimer();
            alert(timerMode.textContent + " finished! Great work! 🎉");
        }
    }, 1000);
}

startTimerBtn.addEventListener("click", startTimer);
document.getElementById("resetTimer").addEventListener("click", () => { stopTimer(); timerSeconds = selectedMinutes * 60; updateTimerDisplay(); });

document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        stopTimer();
        document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedMinutes = Number(btn.dataset.minutes);
        timerSeconds = selectedMinutes * 60;
        timerMode.textContent = btn.dataset.mode;
        updateTimerDisplay();
    });
});
updateTimerDisplay();

// ======================================
// 11. DAILY GOALS (LOCAL STORAGE)
// ======================================
let goals = JSON.parse(localStorage.getItem("growmateGoals")) || [];
function saveGoals() { localStorage.setItem("growmateGoals", JSON.stringify(goals)); updateGamification(); }

function renderGoals() {
    const list = document.getElementById("goalList"); list.innerHTML = "";
    if (!goals.length) list.innerHTML = '<p class="empty-message">No goals yet.</p>';
    
    goals.forEach(goal => {
        const item = document.createElement("div"); item.className = "goal-item";
        item.innerHTML = `
            <label class="goal-label">
                <input type="checkbox" ${goal.completed ? "checked" : ""}>
                <span class="${goal.completed ? "goal-done" : ""}">${escapeHTML(goal.title)}</span>
            </label>
            <button class="icon-btn" style="color:#d45b65; font-size:12px; border:none;">×</button>
        `;
        item.querySelector("input").addEventListener("change", (e) => { goal.completed = e.target.checked; saveGoals(); renderGoals(); });
        item.querySelector("button").addEventListener("click", () => { goals = goals.filter(g => g.id !== goal.id); saveGoals(); renderGoals(); });
        list.appendChild(item);
    });

    const done = goals.filter(g => g.completed).length;
    const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;
    document.getElementById("goalCount").textContent = `${done} of ${goals.length} completed`;
    document.getElementById("goalPercent").textContent = pct + "%";
    document.getElementById("goalProgressBar").style.width = pct + "%";
}

document.getElementById("goalForm").addEventListener("submit", e => {
    e.preventDefault();
    const title = document.getElementById("goalInput").value.trim();
    if (title) { goals.push({ id: Date.now(), title, completed: false }); saveGoals(); renderGoals(); document.getElementById("goalInput").value = ""; }
});
renderGoals();

// ======================================
// 12. STICKY NOTES
// ======================================
const stickyBoard = document.getElementById("stickyNotesBoard");
const addStickyBtn = document.getElementById("addStickyBtn");

const stickyColors = ['#fdfd96', '#ffb7b2', '#aec6cf', '#b5ead7', '#e2c6ff', '#ffe3b3'];
let stickyNotes = JSON.parse(localStorage.getItem("growmateStickyNotes")) || [];

function saveStickyNotes() {
    localStorage.setItem("growmateStickyNotes", JSON.stringify(stickyNotes));
}

function renderStickyNotes() {
    stickyBoard.innerHTML = "";
    
    if (stickyNotes.length === 0) {
        stickyBoard.innerHTML = '<p class="empty-message" style="grid-column: 1 / -1; background: var(--surface); padding: 30px; border-radius: 12px;">No sticky notes yet. Click "+ New Note" to pin your first thought! 📌</p>';
        return;
    }
    
    stickyNotes.forEach(note => {
        const noteEl = document.createElement("div");
        noteEl.className = "sticky-note";
        noteEl.style.backgroundColor = note.color;
        
        noteEl.innerHTML = `
            <div class="sticky-header">
                <button class="sticky-delete" title="Delete note">×</button>
            </div>
            <textarea class="sticky-content" placeholder="Type your thought here...">${escapeHTML(note.text)}</textarea>
        `;
        
        const textarea = noteEl.querySelector("textarea");
        textarea.value = note.text; 
        
        textarea.addEventListener("input", (e) => {
            note.text = e.target.value;
            saveStickyNotes();
        });
        
        noteEl.querySelector(".sticky-delete").addEventListener("click", () => {
            if(confirm("Delete this sticky note?")) {
                stickyNotes = stickyNotes.filter(n => n.id !== note.id);
                saveStickyNotes();
                renderStickyNotes();
            }
        });
        
        stickyBoard.appendChild(noteEl);
    });
}

addStickyBtn.addEventListener("click", () => {
    const randomColor = stickyColors[Math.floor(Math.random() * stickyColors.length)];
    stickyNotes.unshift({
        id: Date.now(),
        text: "",
        color: randomColor
    });
    saveStickyNotes();
    renderStickyNotes();
});
renderStickyNotes();

// ======================================
// UTILS & INIT
// ======================================
function escapeHTML(str) { const div = document.createElement("div"); div.textContent = str; return div.innerHTML; }

setTodayDate();
loadActivities();