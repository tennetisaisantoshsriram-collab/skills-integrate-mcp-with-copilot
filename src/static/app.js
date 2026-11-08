document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const teacherStatus = document.getElementById("teacher-status");
  const teacherToggleButton = document.getElementById("teacher-toggle");
  const teacherModal = document.getElementById("teacher-modal");
  const teacherLoginForm = document.getElementById("teacher-login-form");
  const activitySearch = document.getElementById("activity-search");
  const categoryFilter = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");

  const teacherState = {
    username: "",
    password: "",
    loggedIn: false,
  };

  function showMessage(message, type = "info") {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");
    window.clearTimeout(showMessage.timeoutId);
    showMessage.timeoutId = window.setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function getBasicAuthHeader() {
    if (!teacherState.loggedIn || !teacherState.username || !teacherState.password) {
      return {};
    }

    return {
      Authorization: `Basic ${window.btoa(`${teacherState.username}:${teacherState.password}`)}`,
    };
  }

  function updateTeacherUI() {
    teacherStatus.textContent = teacherState.loggedIn ? `Logged in: ${teacherState.username}` : "Guest";
    teacherToggleButton.classList.toggle("active", teacherState.loggedIn);
  }

  function openTeacherModal() {
    teacherModal.classList.remove("hidden");
    document.getElementById("teacher-username").focus();
  }

  function closeTeacherModal() {
    teacherModal.classList.add("hidden");
    teacherLoginForm.reset();
  }

  function buildCategoryOptions(activities) {
    const categories = ["all", ...new Set(Object.values(activities).map((activity) => activity.category || "General"))];
    categoryFilter.innerHTML = categories
      .map((category) => `<option value="${category}">${category === "all" ? "All categories" : category}</option>`)
      .join("");
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      buildCategoryOptions(activities);

      const searchText = activitySearch.value.trim().toLowerCase();
      const selectedCategory = categoryFilter.value;
      const sortMode = sortSelect.value;

      const entries = Object.entries(activities).map(([name, details]) => ({
        name,
        ...details,
      }));

      const filteredActivities = entries.filter((activity) => {
        const categoryMatches = selectedCategory === "all" || activity.category === selectedCategory;
        const searchMatches =
          !searchText ||
          activity.name.toLowerCase().includes(searchText) ||
          (activity.description || "").toLowerCase().includes(searchText) ||
          (activity.schedule || "").toLowerCase().includes(searchText);
        return categoryMatches && searchMatches;
      });

      const sortedActivities = [...filteredActivities].sort((left, right) => {
        if (sortMode === "availability") {
          const leftSpots = left.max_participants - left.participants.length;
          const rightSpots = right.max_participants - right.participants.length;
          return rightSpots - leftSpots;
        }

        if (sortMode === "schedule") {
          return (left.schedule || "").localeCompare(right.schedule || "");
        }

        return left.name.localeCompare(right.name);
      });

      activitiesList.innerHTML = "";

      if (sortedActivities.length === 0) {
        activitiesList.innerHTML = "<p>No activities match your filters.</p>";
        return;
      }

      sortedActivities.forEach((activity) => {
        const card = document.createElement("article");
        card.className = "activity-card";

        const spotsLeft = activity.max_participants - activity.participants.length;
        const isFull = spotsLeft <= 0;

        const participantList = activity.participants.length
          ? `
            <div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${activity.participants
                  .map(
                    (email) => `
                      <li>
                        <span class="participant-email">${email}</span>
                        ${teacherState.loggedIn ? `<button class="delete-btn" type="button" data-activity="${activity.name}" data-email="${email}">❌</button>` : ""}
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : `<p><em>No participants yet</em></p>`;

        const registerButton = document.createElement("button");
        registerButton.type = "button";
        registerButton.textContent = teacherState.loggedIn ? (isFull ? "Full" : "Register Student") : "Teacher Login Required";
        registerButton.className = "action-button";
        registerButton.disabled = !teacherState.loggedIn || isFull;
        registerButton.addEventListener("click", () => handleRegister(activity.name));

        card.innerHTML = `
          <div class="card-header">
            <span class="activity-tag">${activity.category || "General"}</span>
            <span class="spots-badge ${spotsLeft > 0 ? "open" : "full"}">${spotsLeft} spots left</span>
          </div>
          <h4>${activity.name}</h4>
          <p>${activity.description}</p>
          <p><strong>Schedule:</strong> ${activity.schedule}</p>
          <div class="participants-container">
            ${participantList}
          </div>
        `;

        const actions = document.createElement("div");
        actions.className = "card-actions";
        actions.appendChild(registerButton);
        card.appendChild(actions);
        activitiesList.appendChild(card);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleRegister(activityName) {
    if (!teacherState.loggedIn) {
      openTeacherModal();
      showMessage("Teacher login is required to register students.", "error");
      return;
    }

    const email = window.prompt(`Enter the student email for ${activityName}:`, "student@mergington.edu");
    if (!email || !email.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email.trim())}`,
        {
          method: "POST",
          headers: getBasicAuthHeader(),
        }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "Registration failed.", "error");
      }
    } catch (error) {
      console.error("Error signing up:", error);
      showMessage("Failed to sign up. Please try again.", "error");
    }
  }

  async function handleUnregister(event) {
    const button = event.target.closest(".delete-btn");
    if (!button) {
      return;
    }

    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getBasicAuthHeader(),
        }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "Unregister failed.", "error");
      }
    } catch (error) {
      console.error("Error unregistering:", error);
      showMessage("Failed to unregister. Please try again.", "error");
    }
  }

  teacherToggleButton.addEventListener("click", () => {
    if (teacherState.loggedIn) {
      teacherState.username = "";
      teacherState.password = "";
      teacherState.loggedIn = false;
      updateTeacherUI();
      fetchActivities();
      showMessage("Teacher logged out.", "info");
      return;
    }

    openTeacherModal();
  });

  document.getElementById("cancel-login").addEventListener("click", closeTeacherModal);

  teacherLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("teacher-username").value.trim();
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch("/teachers/login", {
        method: "POST",
        headers: {
          Authorization: `Basic ${window.btoa(`${username}:${password}`)}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        teacherState.username = username;
        teacherState.password = password;
        teacherState.loggedIn = true;
        updateTeacherUI();
        closeTeacherModal();
        fetchActivities();
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "Login failed.", "error");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      showMessage("Teacher login failed. Please try again.", "error");
    }
  });

  activitySearch.addEventListener("input", fetchActivities);
  categoryFilter.addEventListener("change", fetchActivities);
  sortSelect.addEventListener("change", fetchActivities);

  updateTeacherUI();
  fetchActivities();
});
