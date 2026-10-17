
const STATUSES = ["list", "process", "done"];

const STATUS_LABELS = {
  list: "Rejada",
  process: "Jarayonda",
  done: "Bajarildi"
};

// 1. LocalStorage
class LocalStorageTaskRepository {
  constructor(key = "todo-tasks") {
    this.key = key;
  }

  getAll() {
    try {
      const data = localStorage.getItem(this.key);
      const tasks = data ? JSON.parse(data) : [];

      return Array.isArray(tasks)
        ? tasks.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            STATUSES.includes(task.status)
          )
        : [];
    } catch {
      return [];
    }
  }

  saveAll(tasks) {
    localStorage.setItem(this.key, JSON.stringify(tasks));
  }
}

// 2. Vazifalar servisi
class TaskService {
  constructor(repository) {
    this.repository = repository;
  }

  getTasks() {
    return this.repository.getAll();
  }

  addTask(title) {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      throw new Error("Vazifa nomini kiriting!");
    }

    const tasks = this.getTasks();

    const task = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
      title: cleanTitle,
      status: "list",
      createdAt: new Date().toISOString()
    };

    tasks.unshift(task);
    this.repository.saveAll(tasks);

    return task;
  }

  changeStatus(id, status) {
    if (!STATUSES.includes(status)) {
      throw new Error("Vazifa holati noto‘g‘ri!");
    }

    const tasks = this.getTasks();
    const task = tasks.find(item => item.id === id);

    if (!task) {
      throw new Error("Vazifa topilmadi!");
    }

    task.status = status;
    this.repository.saveAll(tasks);
  }

  deleteTask(id) {
    const tasks = this.getTasks();
    const updatedTasks = tasks.filter(task => task.id !== id);

    if (updatedTasks.length === tasks.length) {
      throw new Error("Vazifa topilmadi!");
    }

    this.repository.saveAll(updatedTasks);
  }
}

// 3. Ilova
class TaskApp {
  constructor(service) {
    this.service = service;
    this.activeFilter = "all";
    this.toastTimer = null;

    this.form = document.getElementById("taskForm");
    this.input = document.getElementById("taskInput");
    this.board = document.getElementById("board");

    this.bindEvents();
    this.updateDate();
    this.render();

    // Sana har kuni avtomatik yangilanadi.
    // Sahifa ochiq turganida ham tekshirib boradi.
    setInterval(() => this.updateDate(), 60 * 1000);

    // Tungi vaqtda sahifa ochiq qolgan bo‘lsa ham,
    // yangi sana ko‘rinishini ta'minlaydi.
    window.addEventListener("focus", () => {
      this.updateDate();
    });
  }

  bindEvents() {
    // Vazifa qo‘shish
    this.form.addEventListener("submit", event => {
      event.preventDefault();

      try {
        this.service.addTask(this.input.value);
        this.input.value = "";
        this.activeFilter = "all";
        this.render();
        this.input.focus();
        this.showToast("Vazifa muvaffaqiyatli qo‘shildi!");
      } catch (error) {
        this.showToast(error.message);
      }
    });

    // Statusni o‘zgartirish
    this.board.addEventListener("change", event => {
      if (!event.target.matches(".task-status")) return;

      const card = event.target.closest(".task-card");
      if (!card) return;

      try {
        this.service.changeStatus(
          card.dataset.id,
          event.target.value
        );

        this.render();
        this.showToast("Vazifa holati yangilandi!");
      } catch (error) {
        this.showToast(error.message);
      }
    });

    // Vazifani o‘chirish
    this.board.addEventListener("click", event => {
      const button = event.target.closest(".delete-task");
      if (!button) return;

      const card = button.closest(".task-card");
      if (!card) return;

      if (!confirm("Vazifani o‘chirmoqchimisiz?")) return;

      try {
        this.service.deleteTask(card.dataset.id);
        this.render();
        this.showToast("Vazifa o‘chirildi!");
      } catch (error) {
        this.showToast(error.message);
      }
    });

    // Chap menyudagi barcha tugmalar
    document.querySelectorAll(".nav-item").forEach(button => {
      button.addEventListener("click", () => {
        this.activeFilter = button.dataset.filter;
        this.render();
      });
    });
  }

  // Bugungi sanani chiqarish
  updateDate() {
    const dateElement = document.getElementById("today-date");

    if (!dateElement) return;

    dateElement.textContent = new Date().toLocaleDateString(
      "uz-UZ",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );
  }

  // Bildirishnoma
  showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) {
      alert(message);
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }

  // Bitta vazifa kartasi
  createTaskElement(task) {
    const card = document.createElement("article");
    card.className = "task-card";
    card.dataset.id = task.id;

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    const bottom = document.createElement("div");
    bottom.className = "task-bottom";

    const tag = document.createElement("span");
    tag.className = "task-tag";

    const date = task.createdAt
      ? new Date(task.createdAt)
      : new Date();

    tag.textContent = Number.isNaN(date.getTime())
      ? "Vazifa"
      : date.toLocaleDateString("uz-UZ", {
          day: "numeric",
          month: "short"
        });

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const select = document.createElement("select");
    select.className = "task-status";
    select.setAttribute("aria-label", "Vazifa holatini o‘zgartirish");

    STATUSES.forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = STATUS_LABELS[status];
      option.selected = task.status === status;
      select.appendChild(option);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-task";
    deleteButton.textContent = "×";
    deleteButton.title = "O‘chirish";
    deleteButton.setAttribute("aria-label", "Vazifani o‘chirish");

    actions.append(select, deleteButton);
    bottom.append(tag, actions);
    card.append(title, bottom);

    return card;
  }

  // Barcha ustunlar va statistika
  render() {
    const tasks = this.service.getTasks();

    STATUSES.forEach(status => {
      const column = document.getElementById(status);
      if (!column) return;

      column.replaceChildren();

      const statusTasks = tasks.filter(
        task => task.status === status
      );

      const visible =
        this.activeFilter === "all" ||
        this.activeFilter === status;

      if (visible) {
        statusTasks.forEach(task => {
          column.appendChild(this.createTaskElement(task));
        });
      }

      if (column.children.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = visible
          ? "Hozircha vazifa yo‘q"
          : "Boshqa bo‘limda ko‘rsatilmoqda";

        column.appendChild(empty);
      }

      const count = statusTasks.length;

      this.setText(`count-${status}`, count);
      this.setText(`nav-${status}`, count);
      this.setText(`stat-${status}`, count);
    });

    this.setText("stat-total", tasks.length);
    this.setText("nav-all", tasks.length);

    const completed = tasks.filter(
      task => task.status === "done"
    ).length;

    const percent = tasks.length
      ? Math.round(completed / tasks.length * 100)
      : 0;

    this.setText("completion-note", `${percent}% vazifa yakunlandi`);

    // Menyu rangini yangilash
    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.filter === this.activeFilter
      );
    });

    // Sarlavhani yangilash
    this.setText(
      "board-title",
      this.activeFilter === "all"
        ? "Vazifalarim"
        : `${STATUS_LABELS[this.activeFilter]} vazifalar`
    );
  }

  setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }
}

// 4. Ishga tushirish
const repository = new LocalStorageTaskRepository();
const service = new TaskService(repository);
const app = new TaskApp(service);
