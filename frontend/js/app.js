console.log('app.js: Script execution started.');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('app.js: DOMContentLoaded event fired.');
    try {
        const apiUrl = '/api/tasks';
        const configApiUrl = '/api/config/options';
        const taskForm = document.getElementById('task-form');
        const taskTableBody = document.getElementById('task-table-body');
        const taskIdInput = document.getElementById('task-id');
        const taskNameInput = document.getElementById('task-name');
        const taskDescriptionInput = document.getElementById('task-description');
        const taskDateInput = document.getElementById('task-date');
        const taskTimeInput = document.getElementById('task-time');
        const taskSystemSelect = document.getElementById('task-system');
        const taskActionSelect = document.getElementById('task-action');
        const saveTaskBtn = document.getElementById('save-task-btn');
        const clearFormBtn = document.getElementById('clear-form-btn');

        const filterDateInput = document.getElementById('filter-date');
        const filterWeekInput = document.getElementById('filter-week');
        const filterMonthInput = document.getElementById('filter-month');
        const filterYearInput = document.getElementById('filter-year');
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');

        const tabLinks = document.querySelectorAll('.tab-link');
        console.log('app.js: Tab links found:', tabLinks.length, tabLinks);
        const viewContainers = document.querySelectorAll('.view-container');
        const goToSchedulerBtn = document.getElementById('go-to-scheduler-btn');
        console.log('app.js: Create Schedule button found:', goToSchedulerBtn);

        let fcCalendar;
        let AVAILABLE_TASK_ACTIONS_CACHE = [];

        const populateDropdowns = async () => {
            try {
                const response = await fetch(configApiUrl);
                if (!response.ok) {
                    throw new Error(`Error fetching config options: ${response.statusText}`);
                }
                const options = await response.json();
                taskSystemSelect.innerHTML = '<option value="">Select Target System...</option>';
                if (options.systems) {
                    options.systems.forEach(system => {
                        const optionEl = document.createElement('option');
                        optionEl.value = system;
                        optionEl.textContent = system;
                        taskSystemSelect.appendChild(optionEl);
                    });
                }
                taskActionSelect.innerHTML = '<option value="">Select Task Action...</option>';
                if (options.actions) {
                    options.actions.forEach(action => {
                        const optionEl = document.createElement('option');
                        optionEl.value = action;
                        optionEl.textContent = action;
                        taskActionSelect.appendChild(optionEl);
                    });
                    AVAILABLE_TASK_ACTIONS_CACHE = options.actions;
                    console.log('app.js: AVAILABLE_TASK_ACTIONS_CACHE populated in populateDropdowns.');
                }
            } catch (error) {
                console.error('app.js: Failed to populate dropdowns:', error);
                alert('Failed to load configuration for dropdowns. Please try refreshing the page.');
                taskSystemSelect.innerHTML = '<option value="">Error loading systems</option>';
                taskActionSelect.innerHTML = '<option value="">Error loading actions</option>';
            }
        };

        const initializeCalendar = () => {
            console.log('app.js: Initializing FullCalendar.');
            const calendarEl = document.getElementById('calendar');
            if (!calendarEl) {
                console.error("app.js: Calendar element #calendar not found in DOM.");
                return null;
            }
            const calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                datesSet: function(dateInfo) {
                    console.log("app.js: FullCalendar datesSet event, view.currentStart:", dateInfo.view.currentStart);
                    if (typeof updateCustomControlsForCalendar === "function") {
                        updateCustomControlsForCalendar(dateInfo.view.currentStart);
                    } else {
                        console.warn("app.js: updateCustomControlsForCalendar is not defined at datesSet.");
                    }
                },
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                },
                events: [],
                eventClick: function(info) {
                    console.log('app.js: Calendar event clicked:', info.event.id);
                    const taskData = {
                        id: info.event.id,
                        name: info.event.title,
                        description: info.event.extendedProps.description || '',
                        date: info.event.startStr.split('T')[0],
                        time: info.event.startStr.split('T')[1] ? info.event.startStr.split('T')[1].substring(0,5) : '',
                        target_system: info.event.extendedProps.system || '',
                        status: info.event.extendedProps.status || 'pending',
                        action: info.event.extendedProps.action || ''
                    };
                    editTask(taskData);
                    // Tab switching to scheduler view is now handled within editTask if needed
                },
                editable: false,
                selectable: false,
            });
            calendar.render();
            console.log('app.js: FullCalendar rendered.');
            return calendar;
        };

        const transformTasksForCalendar = (tasks) => {
            if (!tasks) return [];
            return tasks.map(task => {
                let startDateTime = task.date;
                if (task.time) startDateTime += `T${task.time}`;
                let actionPart = task.name;
                const descParts = task.description.split(" - ");
                if (descParts.length > 1 && AVAILABLE_TASK_ACTIONS_CACHE.includes(descParts[0])) {
                     actionPart = descParts[0];
                }
                return {
                    id: task.id, title: task.name, start: startDateTime, allDay: !task.time,
                    extendedProps: {
                        description: task.description, system: task.target_system,
                        status: task.status, originalTime: task.time, action: actionPart
                    }
                };
            });
        };

        const fetchTasks = async (filters = {}) => {
            console.log('app.js: Fetching tasks with filters:', filters);
            let url = apiUrl;
            const queryParams = new URLSearchParams();
            if (filters.date) queryParams.append('date', filters.date);
            if (filters.week) queryParams.append('week', filters.week);
            if (filters.month) queryParams.append('month', filters.month);
            if (filters.year) queryParams.append('year', filters.year);
            const queryString = queryParams.toString();
            if (queryString) url += `?${queryString}`;

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const tasks = await response.json();
                console.log('app.js: Tasks fetched successfully:', tasks.length);
                renderTasks(tasks);
                if (fcCalendar) {
                    if (AVAILABLE_TASK_ACTIONS_CACHE.length === 0) {
                        console.log('app.js: AVAILABLE_TASK_ACTIONS_CACHE is empty, attempting to populate in fetchTasks.');
                        const configResponse = await fetch(configApiUrl);
                        const configOptions = await configResponse.json();
                        if (configOptions.actions) {
                            AVAILABLE_TASK_ACTIONS_CACHE = configOptions.actions;
                            console.log('app.js: AVAILABLE_TASK_ACTIONS_CACHE populated in fetchTasks.');
                        }
                    }
                    const calendarEvents = transformTasksForCalendar(tasks);
                    fcCalendar.removeAllEvents();
                    fcCalendar.addEventSource(calendarEvents);
                    console.log('app.js: Calendar events updated.');
                }
            } catch (error) {
                console.error('app.js: Error fetching tasks:', error);
                alert(`Error fetching tasks: ${error.message}`);
                taskTableBody.innerHTML = `<tr><td colspan="8">Error loading tasks: ${error.message}</td></tr>`;
                if (fcCalendar) fcCalendar.removeAllEvents();
            }
        };

        const renderTasks = (tasks) => {
            taskTableBody.innerHTML = '';
            if (!tasks || tasks.length === 0) {
                taskTableBody.innerHTML = '<tr><td colspan="8">No tasks scheduled or found with current filters.</td></tr>';
                return;
            }
            tasks.forEach(task => {
                const row = taskTableBody.insertRow();
                row.insertCell().textContent = task.name;
                row.insertCell().textContent = task.description;
                row.insertCell().textContent = task.date;
                row.insertCell().textContent = task.time;
                row.insertCell().textContent = task.target_system;
                let actionDisplay = task.name;
                const descParts = task.description.split(" - ");
                 if (descParts.length > 1 && AVAILABLE_TASK_ACTIONS_CACHE.includes(descParts[0])) {
                     actionDisplay = descParts[0];
                }
                row.insertCell().textContent = actionDisplay;
                row.insertCell().textContent = task.status;
                const actionsCell = row.insertCell();
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.classList.add('edit-btn');
                editButton.addEventListener('click', () => {
                    console.log('app.js: Edit button clicked for task ID:', task.id, 'Task data:', task);
                    editTask(task);
                });
                actionsCell.appendChild(editButton);
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.classList.add('delete-btn');
                deleteButton.addEventListener('click', () => deleteTask(task.id));
                actionsCell.appendChild(deleteButton);
            });
        };

        const saveTask = async (event) => {
            event.preventDefault();
            console.log('app.js: saveTask called.');
            const selectedAction = taskActionSelect.value;
            const additionalDetails = taskDescriptionInput.value;
            const fullDescription = selectedAction ? `${selectedAction} - ${additionalDetails}` : additionalDetails;
            const taskData = {
                name: taskNameInput.value, description: fullDescription, date: taskDateInput.value,
                time: taskTimeInput.value, target_system: taskSystemSelect.value, status: 'pending'
            };
            const id = taskIdInput.value;
            const method = id ? 'PUT' : 'POST';
            const url = id ? `${apiUrl}/${id}` : apiUrl;
            try {
                const response = await fetch(url, {
                    method: method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(taskData),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                await response.json();
                clearForm();
                fetchTasks(getFilters());
                alert(`Task ${id ? 'updated' : 'saved'} successfully!`);
            } catch (error) {
                console.error(`app.js: Error ${id ? 'updating' : 'saving'} task:`, error);
                alert(`Error ${id ? 'updating' : 'saving'} task: ${error.message}`);
            }
        };

        const editTask = (task) => {
            console.log('app.js: editTask() function started. Task data received:', task);
            if (!task || typeof task.id === 'undefined') {
                console.error('app.js: editTask() called with invalid or incomplete task object:', task);
                alert('Error: Cannot edit task due to missing task data.');
                return;
            }

            console.log('app.js: editTask - Parsing description. Full description:', task.description);
            console.log('app.js: editTask - AVAILABLE_TASK_ACTIONS_CACHE:', AVAILABLE_TASK_ACTIONS_CACHE);

            let actionPart = '';
            let detailsPart = task.description || '';

            if (task.description && AVAILABLE_TASK_ACTIONS_CACHE && AVAILABLE_TASK_ACTIONS_CACHE.length > 0) {
                let matched = false;
                const sortedActions = [...AVAILABLE_TASK_ACTIONS_CACHE].sort((a, b) => b.length - a.length);
                for (const cachedAction of sortedActions) {
                    if (task.description.startsWith(cachedAction)) {
                        actionPart = cachedAction;
                        detailsPart = task.description.substring(cachedAction.length).trim();
                        if (detailsPart.startsWith("- ")) {
                            detailsPart = detailsPart.substring(2).trim();
                        } else if (detailsPart.startsWith("-")) {
                            detailsPart = detailsPart.substring(1).trim();
                        }
                        if (task.description === cachedAction) {
                             detailsPart = '';
                        }
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    console.warn(`app.js: editTask - Could not parse a valid action from description: "${task.description}". Using full description as details and attempting to find action in dropdown by other means if necessary or leaving action blank.`);
                    actionPart = '';
                    detailsPart = task.description || '';
                }
            } else if (task.description) {
                console.warn('app.js: editTask - AVAILABLE_TASK_ACTIONS_CACHE is empty or not available. Using full description as details.');
                detailsPart = task.description || '';
                actionPart = '';
            } else {
                 actionPart = '';
                 detailsPart = '';
            }
            console.log(`app.js: editTask - Parsed actionPart: "${actionPart}", detailsPart: "${detailsPart}"`);

            console.log('app.js: editTask - Populating form fields...');
            try {
                taskIdInput.value = task.id;
                console.log('  taskIdInput.value set to:', task.id);
                taskNameInput.value = task.name || '';
                console.log('  taskNameInput.value set to:', taskNameInput.value);
                taskActionSelect.value = actionPart;
                console.log('  taskActionSelect.value attempting to set to:', `"${actionPart}"`, '; Current value after set:', `"${taskActionSelect.value}"`);
                if (taskActionSelect.value !== actionPart && actionPart !== '') {
                    console.warn('  taskActionSelect.value was NOT successfully set. Check if actionPart is a valid <option> value in the select list. This can happen if the action from the task description is no longer an available/valid choice.');
                }
                taskDescriptionInput.value = detailsPart;
                console.log('  taskDescriptionInput.value set to:', `"${detailsPart}"`);
                taskDateInput.value = task.date || '';
                console.log('  taskDateInput.value set to:', taskDateInput.value);
                taskTimeInput.value = task.time || task.originalTime || '';
                console.log('  taskTimeInput.value set to:', taskTimeInput.value);
                const systemToSet = task.target_system || task.system || '';
                taskSystemSelect.value = systemToSet;
                console.log('  taskSystemSelect.value attempting to set to:', `"${systemToSet}"`, '; Current value after set:', `"${taskSystemSelect.value}"`);
                if (taskSystemSelect.value !== systemToSet && systemToSet !== '') {
                   console.warn('  taskSystemSelect.value was NOT successfully set. Check if target_system is a valid <option> value.');
                }
                saveTaskBtn.textContent = 'Update Task';
                console.log('  saveTaskBtn.textContent set to: "Update Task"');
            } catch (e) {
                console.error('app.js: editTask - Error during form population:', e);
                alert('An error occurred while trying to populate the form for editing.');
                return;
            }

            console.log('app.js: editTask - Form population complete. Ensuring scheduler tab is active.');
            const schedulerTabLink = document.querySelector('.tab-link[data-view="scheduler-view"]');
            if (schedulerTabLink && !schedulerTabLink.classList.contains('active')) {
                tabLinks.forEach(link => link.classList.remove('active'));
                viewContainers.forEach(container => container.style.display = 'none');
                schedulerTabLink.classList.add('active');
                const schedulerView = document.getElementById('scheduler-view');
                if (schedulerView) schedulerView.style.display = 'block';
                console.log('app.js: editTask - Switched to scheduler tab.');
            } else if (schedulerTabLink && schedulerTabLink.classList.contains('active')) {
                 console.log('app.js: editTask - Scheduler tab already active or no tab links found.');
            }
            window.scrollTo(0, 0);
        };

        const deleteTask = async (id) => {
            console.log('app.js: deleteTask called for task ID:', id);
            if (!confirm('Are you sure you want to delete this task?')) return;
            try {
                const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                if (response.status !== 204 && response.headers.get("content-length") !== "0") {
                     await response.json();
                }
                fetchTasks(getFilters());
                alert('Task deleted successfully!');
            } catch (error) {
                console.error('app.js: Error deleting task:', error);
                alert(`Error deleting task: ${error.message}`);
            }
        };

        const clearForm = () => {
            console.log('app.js: clearForm called.');
            taskForm.reset();
            taskIdInput.value = '';
            taskActionSelect.value = "";
            taskSystemSelect.value = "";
            saveTaskBtn.textContent = 'Save Task';
        };

        const getFilters = () => {
            const filters = {};
            if (filterDateInput.value) filters.date = filterDateInput.value;
            if (filterWeekInput.value) filters.week = filterWeekInput.value;
            if (filterMonthInput.value) filters.month = filterMonthInput.value;
            if (filterYearInput.value) filters.year = filterYearInput.value;
            return filters;
        };

        console.log('app.js: Attaching form and filter button listeners.');
        taskForm.addEventListener('submit', saveTask);
        clearFormBtn.addEventListener('click', clearForm);
        applyFiltersBtn.addEventListener('click', () => {
            console.log('app.js: Apply Filters button clicked.');
            fetchTasks(getFilters());
        });
        clearFiltersBtn.addEventListener('click', () => {
            console.log('app.js: Clear Filters button clicked.');
            filterDateInput.value = ''; filterWeekInput.value = '';
            filterMonthInput.value = ''; filterYearInput.value = '';
            fetchTasks({});
        });

        const switchTab = (event) => {
            const clickedTab = event.target;
            const viewIdToShow = clickedTab.getAttribute('data-view');
            console.log('app.js: switchTab triggered for view:', viewIdToShow);

            tabLinks.forEach(link => link.classList.remove('active'));
            clickedTab.classList.add('active');
            viewContainers.forEach(container => {
                container.style.display = (container.id === viewIdToShow) ? 'block' : 'none';
            });
            if (viewIdToShow === 'calendar-view' && fcCalendar && typeof fcCalendar.updateSize === 'function') {
                fcCalendar.updateSize();
            }
        };

        console.log('app.js: Attempting to attach tab listeners.');
        tabLinks.forEach(link => {
            link.addEventListener('click', switchTab);
        });

        console.log('app.js: Attempting to attach Create Schedule button listener.');
        if (goToSchedulerBtn) {
            goToSchedulerBtn.addEventListener('click', () => {
                console.log('app.js: Create Schedule button clicked.');
                clearForm();
                const schedulerTabLink = document.querySelector('.tab-link[data-view="scheduler-view"]');
                if (schedulerTabLink) {
                    tabLinks.forEach(link => link.classList.remove('active'));
                    viewContainers.forEach(container => container.style.display = 'none');
                    schedulerTabLink.classList.add('active');
                    const schedulerView = document.getElementById('scheduler-view');
                    if (schedulerView) schedulerView.style.display = 'block';
                }
                window.scrollTo(0, 0);
            });
        } else {
            console.error('app.js: Create Schedule button (go-to-scheduler-btn) not found.');
        }

        // Initial async calls
        console.log('app.js: Calling setupCustomCalendarControls() to prepare dropdowns.');
        setupCustomCalendarControls(); // Call it here to get elements and populate options

        console.log('app.js: Starting initial data population and calendar setup.'); //This log was part of the search term, kept for context
        await populateDropdowns(); // This was part of the search term, kept for context

        console.log('app.js: Checking for FullCalendar object before initialization...');
        if (typeof FullCalendar !== 'undefined' && typeof FullCalendar.Calendar === 'function') {
            console.log('app.js: FullCalendar object and FullCalendar.Calendar function ARE defined. Initializing calendar.');
            fcCalendar = initializeCalendar();
        } else {
            console.error('app.js: FullCalendar object or FullCalendar.Calendar function is NOT defined. Calendar will NOT be initialized.');
            const calendarEl = document.getElementById('calendar');
            if (calendarEl) {
                calendarEl.innerHTML = '<p style="color:red; text-align:center; padding:20px; border:1px solid red;">Error: The Calendar library (FullCalendar) failed to load. The calendar cannot be displayed. Please check your internet connection, ad blockers, or browser console for more details.</p>';
            }
        }

        if (fcCalendar) {
            console.log('app.js: Calendar initialized successfully, fetching tasks for calendar and table.');
            // The old call to setupCustomCalendarControls() here was removed by the previous awk script.
            await fetchTasks({});
        } else {
            console.warn("app.js: Calendar was not initialized or failed to initialize. Fetching tasks for table only.");
            await fetchTasks({});
        }
        console.log('app.js: Initial setup async operations complete.');

    } catch (e) {
        console.error('app.js: CRITICAL ERROR in DOMContentLoaded setup:', e, e.stack);
        alert('A critical error occurred while loading the page. Some functionalities might be broken. Please try refreshing or contact support if the issue persists.');
    }
    console.log('app.js: DOMContentLoaded event callback finished.');
});

// --- Custom Calendar Controls Logic ---
// (Functions appended in the previous step are assumed to be here)
// let monthSelectGlobal, yearSelectGlobal; ... etc. ...
// function setupCustomCalendarControls() { ... }
// function populateYearSelectForCustomControls() { ... }
// function populateMonthSelectForCustomControls() { ... }
// function handleCustomDateNavigationForCalendar() { ... }
// function updateCustomControlsForCalendar(date) { ... }

let monthSelectGlobal, yearSelectGlobal;

function setupCustomCalendarControls() {
    console.log("app.js: Setting up custom calendar controls.");
    monthSelectGlobal = document.getElementById('month-select');
    yearSelectGlobal = document.getElementById('year-select');

    if (!monthSelectGlobal || !yearSelectGlobal) {
        console.error("app.js: Month or Year select elements not found for custom controls. Ensure their IDs are 'month-select' and 'year-select'.");
        return;
    }

    populateYearSelectForCustomControls();
    populateMonthSelectForCustomControls();

    monthSelectGlobal.addEventListener('change', handleCustomDateNavigationForCalendar);
    yearSelectGlobal.addEventListener('change', handleCustomDateNavigationForCalendar);

    // (Logic to set initial dropdown values from fcCalendar or system date moved to datesSet event or initial fcCalendar.getDate())
    // if (fcCalendar && typeof fcCalendar.getDate === 'function') { // Check if fcCalendar and getDate method exist
    //     const currentDate = fcCalendar.getDate();
    //     updateCustomControlsForCalendar(currentDate);
    // } else {
    //     console.warn("app.js: fcCalendar not available or getDate not a function at initial setup of custom controls. Setting to current system date.");
    //     const today = new Date();
    //     if (yearSelectGlobal) yearSelectGlobal.value = today.getFullYear();
    //     // if (monthSelectGlobal) monthSelectGlobal.value = today.getMonth();
    // }
}

function populateYearSelectForCustomControls() {
    if (!yearSelectGlobal) return;
    console.log("app.js: Populating year select.");
    const currentYear = new Date().getFullYear();
    yearSelectGlobal.innerHTML = '';
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelectGlobal.appendChild(option);
    }
}

function populateMonthSelectForCustomControls() {
    if (!monthSelectGlobal) return;
    console.log("app.js: Populating month select.");
    const months = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];
    monthSelectGlobal.innerHTML = '';
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelectGlobal.appendChild(option);
    });
}

function handleCustomDateNavigationForCalendar() {
    if (!fcCalendar || !yearSelectGlobal || !monthSelectGlobal || typeof fcCalendar.gotoDate !== 'function') {
        console.error("app.js: Cannot navigate custom date - fcCalendar or select elements missing, or gotoDate is not a function.");
        return;
    }
    console.log("app.js: Custom date navigation triggered.");
    const year = parseInt(yearSelectGlobal.value);
    const month = parseInt(monthSelectGlobal.value);

    const currentCalDate = fcCalendar.getDate();
    let day = currentCalDate.getDate();
    const daysInNewMonth = new Date(year, month + 1, 0).getDate();
    if (day > daysInNewMonth) {
        day = daysInNewMonth;
    }

    fcCalendar.gotoDate(new Date(year, month, day));
}

function updateCustomControlsForCalendar(date) {
    if (!yearSelectGlobal || !monthSelectGlobal) {
        console.warn("app.js: Cannot update custom controls - select elements missing.");
        return;
    }
    console.log("app.js: Updating custom controls to date:", date);
    yearSelectGlobal.value = date.getFullYear();
    monthSelectGlobal.value = date.getMonth();
}
// --- End of Custom Calendar Controls Logic ---
