import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { tap, catchError, of, finalize } from 'rxjs';

interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
  createdAt: string;
}

interface AuthPayload {
  token: string;
  name: string;
  email: string;
  role: string;
}

interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-task-crud',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './taskCrud.html',
  styleUrl: './taskCrud.css'
})
export class TaskCrudComponent implements OnInit {
  private apiUrl = '/api/Tasks';
  private authUrl = '/api/Auth';

  tasks: Task[] = [];
  filteredTasks: Task[] = []; // Tasks hiển thị theo trang
  taskForm: Task = this.getEmptyTask();
  isEditMode = false;
  loading = false;
  errorMessage = '';

  loginForm = {
    email: '',
    password: ''
  };

  registerForm = {
    name: '',
    email: '',
    password: ''
  };

  // Paging
  currentPage = 1;
  pageSize = 4;
  totalItems = 0;
  totalPages = 0;

  // Tách date và time cho deadline (24h)
  deadlineDate = '';
  deadlineTime = '00:00';

  token = '';
  currentUserName = '';
  currentUserEmail = '';
  currentUserRole = '';
  users: UserSummary[] = [];
  updatingRoleUserId: number | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.restoreAuthState();
    if (this.isAuthenticated) {
      this.loadTasks();
      this.loadUsers();
    }
  }

  loadTasks(): void {
    if (!this.isAuthenticated) return;
    this.loading = true;
    this.errorMessage = '';
    this.http.get<Task[]>(this.apiUrl, this.getAuthOptions()).pipe(
      tap(data => {
        // Sắp xếp: chưa hoàn thành trước theo deadline, hoàn thành xuống dưới
        this.tasks = data.sort((a, b) => {
          // Hoàn thành xuống dưới
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
          // Sắp xếp theo deadline tăng dần
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
        // Tính toán paging
        this.totalItems = this.tasks.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.updatePageData();
        this.loading = false;
        this.cdr.detectChanges();
      }),
      catchError(err => {
        this.handleHttpError(err, 'Không thể tải danh sách task.');
        this.loading = false;
        return of([]);
      })
    ).subscribe();
  }

  saveTask(): void {
    if (!this.isAdmin) {
      this.errorMessage = 'Chỉ Admin mới có quyền thêm/sửa task.';
      return;
    }

    if (!this.taskForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề!');
      return;
    }

    // Kết hợp date và time thành deadline
    if (this.deadlineDate) {
      this.taskForm.deadline = `${this.deadlineDate}T${this.deadlineTime}:00`;
    }

    if (this.isEditMode) {
      this.http.put(`${this.apiUrl}/${this.taskForm.id}`, this.taskForm, this.getAuthOptions()).pipe(
        tap(() => {
          this.loadTasks();
          this.resetForm();
        }),
        catchError(err => {
          this.handleHttpError(err, 'Không thể cập nhật task.');
          return of(null);
        })
      ).subscribe();
    } else {
      const newTask = {
        ...this.taskForm,
        createdAt: this.getLocalDateTime()
      };

      this.http.post(this.apiUrl, newTask, this.getAuthOptions()).pipe(
        tap(() => {
          this.loadTasks();
          this.resetForm();
        }),
        catchError(err => {
          this.handleHttpError(err, 'Không thể thêm task mới.');
          return of(null);
        })
      ).subscribe();
    }
  }

  editTask(task: Task): void {
    if (!this.isAdmin) return;
    this.taskForm = { ...task };
    this.isEditMode = true;
    // Tách deadline thành date và time
    if (task.deadline) {
      const [datePart, timePart] = task.deadline.split('T');
      this.deadlineDate = datePart;
      this.deadlineTime = timePart ? timePart.substring(0, 5) : '00:00';
    }
  }

  deleteTask(id: number): void {
    if (!this.isAdmin) {
      this.errorMessage = 'Chỉ Admin mới có quyền xóa task.';
      return;
    }

    if (confirm('Bạn có chắc muốn xóa task này?')) {
      this.http.delete(`${this.apiUrl}/${id}`, this.getAuthOptions()).pipe(
        tap(() => this.loadTasks()),
        catchError(err => {
          this.handleHttpError(err, 'Không thể xóa task.');
          return of(null);
        })
      ).subscribe();
    }
  }

  resetForm(): void {
    this.taskForm = this.getEmptyTask();
    this.isEditMode = false;
    this.deadlineDate = '';
    this.deadlineTime = '00:00';
  }

  register(): void {
    this.errorMessage = '';
    if (!this.registerForm.name.trim() || !this.registerForm.email.trim() || !this.registerForm.password.trim()) {
      this.errorMessage = 'Vui lòng nhập đầy đủ thông tin đăng ký.';
      return;
    }

    this.http.post<AuthPayload>(`${this.authUrl}/register`, this.registerForm).pipe(
      tap((res) => {
        this.applyAuth(res);
        this.registerForm = { name: '', email: '', password: '' };
        this.loginForm = { email: '', password: '' };
        this.loadTasks();
        this.loadUsers();
      }),
      catchError(err => {
        this.handleHttpError(err, 'Đăng ký thất bại.');
        return of(null);
      })
    ).subscribe();
  }

  login(): void {
    this.errorMessage = '';
    if (!this.loginForm.email.trim() || !this.loginForm.password.trim()) {
      this.errorMessage = 'Vui lòng nhập email và mật khẩu.';
      return;
    }

    this.http.post<AuthPayload>(`${this.authUrl}/login`, this.loginForm).pipe(
      tap((res) => {
        this.applyAuth(res);
        this.loadTasks();
        this.loadUsers();
      }),
      catchError(err => {
        this.handleHttpError(err, 'Đăng nhập thất bại.');
        return of(null);
      })
    ).subscribe();
  }

  logout(): void {
    this.token = '';
    this.currentUserName = '';
    this.currentUserEmail = '';
    this.currentUserRole = '';
    this.tasks = [];
    this.filteredTasks = [];
    this.totalItems = 0;
    this.totalPages = 0;
    this.currentPage = 1;
    this.users = [];
    this.updatingRoleUserId = null;
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Chưa hoàn thành',
      'in-progress': 'Đang thực hiện',
      'completed': 'Hoàn thành'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-badge status-${status}`;
  }

  getLocalDateTime(): string {
    // Lấy giờ Việt Nam (UTC+7)
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toISOString().slice(0, 16);
  }

  // Paging methods
  updatePageData(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredTasks = this.tasks.slice(start, end);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePageData();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePageData();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePageData();
    }
  }

  getPages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Format cho deadline - giữ nguyên giờ
  formatDeadline(dateStr: string): string {
    if (!dateStr) return '';
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hours, minutes] = match;
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    }
    return dateStr;
  }

  // Format cho ngày tạo - cộng +7 giờ cho giờ Việt Nam
  formatCreatedAt(dateStr: string): string {
    if (!dateStr) return '';
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hours, minutes] = match;
      let hour = parseInt(hours) + 7;
      if (hour >= 24) hour -= 24;
      return `${String(hour).padStart(2, '0')}:${minutes} ${day}/${month}/${year}`;
    }
    return dateStr;
  }

  private getEmptyTask(): Task {
    return {
      id: 0,
      title: '',
      description: '',
      deadline: '',
      status: 'pending',
      createdAt: ''
    };
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  get isAdmin(): boolean {
    return this.currentUserRole.toUpperCase() === 'ADMIN';
  }

  loadUsers(): void {
    if (!this.isAdmin) {
      this.users = [];
      return;
    }

    this.http.get<UserSummary[]>(`${this.authUrl}/users`, this.getAuthOptions()).pipe(
      tap((data) => {
        this.users = data.map((u) => ({
          ...u,
          role: (u.role ?? '').toUpperCase()
        }));
      }),
      catchError((err) => {
        this.handleHttpError(err, 'Không thể tải danh sách user.');
        return of([]);
      })
    ).subscribe();
  }

  updateUserRole(user: UserSummary, role: string): void {
    if (!this.isAdmin) {
      this.errorMessage = 'Chỉ Admin mới có quyền đổi role.';
      return;
    }

    const nextRole = role.toUpperCase();
    if (nextRole !== 'USER' && nextRole !== 'ADMIN') {
      this.errorMessage = 'Role không hợp lệ.';
      return;
    }

    this.errorMessage = '';
    this.updatingRoleUserId = user.id;
    this.http.put<UserSummary>(
      `${this.authUrl}/users/${user.id}/role`,
      { role: nextRole },
      this.getAuthOptions()
    ).pipe(
      tap((updatedUser) => {
        this.users = this.users.map((item) =>
          item.id === updatedUser.id
            ? { ...item, role: updatedUser.role.toUpperCase() }
            : item
        );
      }),
      catchError((err) => {
        this.handleHttpError(err, 'Không thể cập nhật role.');
        return of(null);
      }),
      finalize(() => {
        this.updatingRoleUserId = null;
      })
    ).subscribe();
  }

  private getAuthOptions(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.token}`
      })
    };
  }

  private applyAuth(payload: AuthPayload): void {
    this.token = payload.token;
    this.currentUserName = payload.name;
    this.currentUserEmail = payload.email;
    this.currentUserRole = payload.role;

    localStorage.setItem('token', payload.token);
    localStorage.setItem('name', payload.name);
    localStorage.setItem('email', payload.email);
    localStorage.setItem('role', payload.role);
  }

  private restoreAuthState(): void {
    this.token = localStorage.getItem('token') ?? '';
    this.currentUserName = localStorage.getItem('name') ?? '';
    this.currentUserEmail = localStorage.getItem('email') ?? '';
    this.currentUserRole = localStorage.getItem('role') ?? '';
  }

  private handleHttpError(err: any, fallbackMessage: string): void {
    if (err?.status === 401) {
      this.errorMessage = 'Phiên đăng nhập hết hạn hoặc chưa đăng nhập.';
      return;
    }

    if (err?.status === 403) {
      this.errorMessage = 'Bạn không có quyền thực hiện chức năng này.';
      return;
    }

    this.errorMessage = err?.error || fallbackMessage;
  }
}
