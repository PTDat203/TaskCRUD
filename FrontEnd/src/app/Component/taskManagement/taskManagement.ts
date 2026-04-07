import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './taskManagement.html',
  styleUrl: './taskManagement.css'
})
export class TaskManagementComponent implements OnInit {
  private apiUrl = '/api/Tasks';

  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  taskForm: Task = this.getEmptyTask();
  isEditMode = false;
  loading = false;
  errorMessage = '';

  currentPage = 1;
  pageSize = 4;
  totalItems = 0;
  totalPages = 0;
  deadlineDate = '';
  deadlineTime = '00:00';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<Task[]>(this.apiUrl, this.authService.getAuthOptions()).pipe(
      tap((data) => {
        this.tasks = data.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
        this.totalItems = this.tasks.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.updatePageData();
        this.loading = false;
        this.cdr.detectChanges();
      }),
      catchError((err) => {
        this.handleHttpError(err, 'Không thể tải danh sách task.');
        this.loading = false;
        return of([]);
      })
    ).subscribe();
  }

  saveTask(): void {
    if (!this.authService.isAdmin) {
      this.errorMessage = 'Chỉ Admin mới có quyền thêm/sửa task.';
      return;
    }

    if (!this.taskForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề!');
      return;
    }

    if (this.deadlineDate) {
      this.taskForm.deadline = `${this.deadlineDate}T${this.deadlineTime}:00`;
    }

    if (this.isEditMode) {
      this.http.put(
        `${this.apiUrl}/${this.taskForm.id}`,
        this.taskForm,
        this.authService.getAuthOptions()
      ).pipe(
        tap(() => {
          this.loadTasks();
          this.resetForm();
        }),
        catchError((err) => {
          this.handleHttpError(err, 'Không thể cập nhật task.');
          return of(null);
        })
      ).subscribe();
      return;
    }

    const newTask = {
      ...this.taskForm,
      createdAt: this.getLocalDateTime()
    };

    this.http.post(this.apiUrl, newTask, this.authService.getAuthOptions()).pipe(
      tap(() => {
        this.loadTasks();
        this.resetForm();
      }),
      catchError((err) => {
        this.handleHttpError(err, 'Không thể thêm task mới.');
        return of(null);
      })
    ).subscribe();
  }

  editTask(task: Task): void {
    if (!this.authService.isAdmin) return;
    this.taskForm = { ...task };
    this.isEditMode = true;
    if (task.deadline) {
      const [datePart, timePart] = task.deadline.split('T');
      this.deadlineDate = datePart;
      this.deadlineTime = timePart ? timePart.substring(0, 5) : '00:00';
    }
  }

  deleteTask(id: number): void {
    if (!this.authService.isAdmin) {
      this.errorMessage = 'Chỉ Admin mới có quyền xóa task.';
      return;
    }

    if (!confirm('Bạn có chắc muốn xóa task này?')) return;

    this.http.delete(`${this.apiUrl}/${id}`, this.authService.getAuthOptions()).pipe(
      tap(() => this.loadTasks()),
      catchError((err) => {
        this.handleHttpError(err, 'Không thể xóa task.');
        return of(null);
      })
    ).subscribe();
  }

  resetForm(): void {
    this.taskForm = this.getEmptyTask();
    this.isEditMode = false;
    this.deadlineDate = '';
    this.deadlineTime = '00:00';
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Chưa hoàn thành',
      'in-progress': 'Đang thực hiện',
      completed: 'Hoàn thành'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-badge status-${status}`;
  }

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
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }
  onPageSizeChange(): void {
    if (this.pageSize < 1) this.pageSize = 1;
  
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.updatePageData();
  }

  formatDeadline(dateStr: string): string {
    if (!dateStr) return '';
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return dateStr;
    const [, year, month, day, hours, minutes] = match;
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  }

  formatCreatedAt(dateStr: string): string {
    if (!dateStr) return '';
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return dateStr;
    const [, year, month, day, hours, minutes] = match;
    let hour = parseInt(hours) + 7;
    if (hour >= 24) hour -= 24;
    return `${String(hour).padStart(2, '0')}:${minutes} ${day}/${month}/${year}`;
  }

  private getLocalDateTime(): string {
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toISOString().slice(0, 16);
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
