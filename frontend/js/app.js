document.addEventListener('DOMContentLoaded', async () => { // Made async
    const apiUrl = 'http://localhost:5000/api/tasks';
    const configApiUrl = 'http://localhost:5000/api/config/options'; // New API endpoint for config
    const taskForm = document.getElementById('task-form');
    const taskTableBody = document.getElementById('task-table-body');
    const taskIdInput = document.getElementById('task-id');
    const taskNameInput = document.getElementById('task-name'); // Task Title/Summary
    const taskDescriptionInput = document.getElementById('task-description'); // Additional Details/Notes
    const taskDateInput = document.getElementById('task-date');
    const taskTimeInput = document.getElementById('task-time');
    const taskSystemSelect = document.getElementById('task-system'); // Now a select
    const taskActionSelect = document.getElementById('task-action'); // Now a select
    const saveTaskBtn = document.getElementById('save-task-btn');
    const clearFormBtn = document.getElementById('clear-form-btn');

    // Filter inputs
    const filterDateInput = document.getElementById('filter-date');
    const filterWeekInput = document.getElementById('filter-week');
    const filterMonthInput = document.getElementById('filter-month');
    const filterYearInput = document.getElementById('filter-year');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    let fcCalendar;

    const populateDropdowns = async () => {
        try {
            const response = await fetch(configApiUrl);
            if (!response.ok) {
                throw new Error(`Error fetching config options: ${response.statusText}`);
            }
            const options = await response.json();

            // Populate Target Systems
            taskSystemSelect.innerHTML = '<option value="">Select Target System...</option>'; // Default option
            if (options.systems) {
                options.systems.forEach(system => {
                    const optionEl = document.createElement('option');
                    optionEl.value = system;
                    optionEl.textContent = system;
                    taskSystemSelect.appendChild(optionEl);
                });
            }

            // Populate Task Actions
            taskActionSelect.innerHTML = '<option value="">Select Task Action...</option>'; // Default option
            if (options.actions) {
                options.actions.forEach(action => {
                    const optionEl = document.createElement('option');
                    optionEl.value = action;
                    optionEl.textContent = action;
                    taskActionSelect.appendChild(optionEl);
                });
            }
        } catch (error) {
            console.error('Failed to populate dropdowns:', error);
            alert('Failed to load configuration for dropdowns. Please try refreshing the page.');
            // Add placeholder options if fetch fails, to keep form usable
            taskSystemSelect.innerHTML = '<option value="">Error loading systems</option>';
            taskActionSelect.innerHTML = '<option value="">Error loading actions</option>';
        }
    };


    const initializeCalendar = () => {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.error("Calendar element #calendar not found in DOM.");
            return null;
        }
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            },
            events: [],
            eventClick: function(info) {
                const taskData = {
                    id: info.event.id,
                    name: info.event.title, // This is task.name (Task Title/Summary)
                    // Description needs to be split back from "Action - Details"
                    description: info.event.extendedProps.description || '',
                    date: info.event.startStr.split('T')[0],
                    time: info.event.startStr.split('T')[1] ? info.event.startStr.split('T')[1].substring(0,5) : '',
                    target_system: info.event.extendedProps.system || '',
                    status: info.event.extendedProps.status || 'pending',
                    // We need a way to get the original action for the dropdown
                    // This will be tricky if only description is stored.
                    // For now, editTask will try to parse it.
                    action: info.event.extendedProps.action || '' // Assuming we store this in extendedProps
                };
                editTask(taskData);
            },
            editable: false,
            selectable: false,
        });
        calendar.render();
        return calendar;
    };

    const transformTasksForCalendar = (tasks) => {
        if (!tasks) return [];
        return tasks.map(task => {
            let startDateTime = task.date;
            if (task.time) {
                startDateTime += `T${task.time}`;
            }
            // Extract action from description for calendar display if possible
            let actionPart = task.name; // Default to task name if no specific action in description
            const descParts = task.description.split(" - ");
            if (descParts.length > 1 && AVAILABLE_TASK_ACTIONS_CACHE.includes(descParts[0])) { // AVAILABLE_TASK_ACTIONS_CACHE needs to be populated
                 actionPart = descParts[0];
            }

            return {
                id: task.id,
                title: task.name, // Main title for the event
                start: startDateTime,
                allDay: !task.time,
                extendedProps: {
                    description: task.description, // Full original description
                    system: task.target_system,
                    status: task.status,
                    originalTime: task.time,
                    action: actionPart // Store the determined action
                }
            };
        });
    };

    let AVAILABLE_TASK_ACTIONS_CACHE = []; // Cache for task actions

    const fetchTasks = async (filters = {}) => {
        let url = apiUrl;
        const queryParams = new URLSearchParams();

        if (filters.date) queryParams.append('date', filters.date);
        if (filters.week) queryParams.append('week', filters.week);
        if (filters.month) queryParams.append('month', filters.month);
        if (filters.year) queryParams.append('year', filters.year);

        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const tasks = await response.json();
            renderTasks(tasks);

            if (fcCalendar) {
                // Ensure AVAILABLE_TASK_ACTIONS_CACHE is populated before transforming tasks
                if (AVAILABLE_TASK_ACTIONS_CACHE.length === 0) {
                    const configResponse = await fetch(configApiUrl);
                    const configOptions = await configResponse.json();
                    if (configOptions.actions) AVAILABLE_TASK_ACTIONS_CACHE = configOptions.actions;
                }
                const calendarEvents = transformTasksForCalendar(tasks);
                fcCalendar.removeAllEvents();
                fcCalendar.addEventSource(calendarEvents);
            }

        } catch (error) {
            console.error('Error fetching tasks:', error);
            alert(`Error fetching tasks: ${error.message}`);
            taskTableBody.innerHTML = `<tr><td colspan="8">Error loading tasks: ${error.message}</td></tr>`;
            if (fcCalendar) {
                fcCalendar.removeAllEvents();
            }
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
            row.insertCell().textContent = task.name; // Task Title/Summary
            row.insertCell().textContent = task.description; // Full description (Action - Details)
            row.insertCell().textContent = task.date;
            row.insertCell().textContent = task.time;
            row.insertCell().textContent = task.target_system;

            // For "Action/Command" column in table, show the action part of description or name
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
            editButton.addEventListener('click', () => editTask(task));
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

        const selectedAction = taskActionSelect.value;
        const additionalDetails = taskDescriptionInput.value;
        // Combine selected action and additional details for the backend description field
        const fullDescription = selectedAction ? `${selectedAction} - ${additionalDetails}` : additionalDetails;

        const taskData = {
            name: taskNameInput.value, // From "Task Title/Summary" input
            description: fullDescription, // Combined
            date: taskDateInput.value,
            time: taskTimeInput.value,
            target_system: taskSystemSelect.value, // From select
            status: 'pending'
        };

        const id = taskIdInput.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${apiUrl}/${id}` : apiUrl;

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData),
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
            console.error(`Error ${id ? 'updating' : 'saving'} task:`, error);
            alert(`Error ${id ? 'updating' : 'saving'} task: ${error.message}`);
        }
    };

    const editTask = (task) => {
        taskIdInput.value = task.id;
        taskNameInput.value = task.name; // Task Title/Summary

        // Attempt to split description back into action and details
        // This relies on the "Action - Details" format and assumes action is one of the predefined ones
        let actionPart = '';
        let detailsPart = task.description || '';

        if (task.description) {
            const parts = task.description.split(" - ");
            // Check if the first part is a known action
            if (parts.length > 1 && AVAILABLE_TASK_ACTIONS_CACHE.includes(parts[0])) {
                actionPart = parts[0];
                detailsPart = parts.slice(1).join(" - ");
            } else if (AVAILABLE_TASK_ACTIONS_CACHE.includes(parts[0])) { // Case where there's only action, no " - "
                actionPart = parts[0];
                detailsPart = "";
            }
        }

        taskActionSelect.value = actionPart; // Set dropdown
        taskDescriptionInput.value = detailsPart; // Set "Additional Details/Notes"

        taskDateInput.value = task.date;
        taskTimeInput.value = task.originalTime || task.time || "";
        taskSystemSelect.value = task.target_system || task.system || "";
        saveTaskBtn.textContent = 'Update Task';
        window.scrollTo(0, 0);
    };

    const deleteTask = async (id) => {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }
        try {
            const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            if (response.status !== 204) { await response.json(); }
            fetchTasks(getFilters());
            alert('Task deleted successfully!');
        } catch (error) {
            console.error('Error deleting task:', error);
            alert(`Error deleting task: ${error.message}`);
        }
    };

    const getFilters = () => { // Renamed from previous local scope to module scope if needed elsewhere
        const filters = {};
        if (filterDateInput.value) filters.date = filterDateInput.value;
        if (filterWeekInput.value) filters.week = filterWeekInput.value;
        if (filterMonthInput.value) filters.month = filterMonthInput.value;
        if (filterYearInput.value) filters.year = filterYearInput.value;
        return filters;
    };

    const clearForm = () => {
        taskForm.reset();
        taskIdInput.value = '';
        taskActionSelect.value = ""; // Reset dropdowns to default
        taskSystemSelect.value = "";
        saveTaskBtn.textContent = 'Save Task';
    };

    taskForm.addEventListener('submit', saveTask);
    clearFormBtn.addEventListener('click', clearForm);

    applyFiltersBtn.addEventListener('click', () => {
        const currentFilters = getFilters();
        fetchTasks(currentFilters);
    });

    clearFiltersBtn.addEventListener('click', () => {
        filterDateInput.value = '';
        filterWeekInput.value = '';
        filterMonthInput.value = '';
        filterYearInput.value = '';
        fetchTasks({});
    });

    // Populate dropdowns first
    await populateDropdowns();
    // Initialize calendar
    fcCalendar = initializeCalendar();

    // Then fetch initial tasks
    if (fcCalendar) {
        fetchTasks({});
    } else {
        fetchTasks({});
        taskTableBody.innerHTML = `<tr><td colspan="8">Calendar initialization failed. Task table active.</td></tr>`;
    }
});
