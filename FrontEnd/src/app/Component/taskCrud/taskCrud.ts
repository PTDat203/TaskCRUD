import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { tap, catchError, of } from 'rxjs';

interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
  createdAt: string;
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

  tasks: Task[] = [];
  filteredTasks: Task[] = []; // Tasks hiển thị theo trang
  taskForm: Task = this.getEmptyTask();
  isEditMode = false;
  loading = false;

  // Paging
  currentPage = 1;
  pageSize = 4;
  totalItems = 0;
  totalPages = 0;

  // Tách date và time cho deadline (24h)
  deadlineDate = '';
  deadlineTime = '00:00';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    console.log('Đang gọi API:', this.apiUrl);
    this.http.get<Task[]>(this.apiUrl).pipe(
      tap(data => {
        console.log('Data nhận được:', data);
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
        console.error('Lỗi khi tải tasks:', err);
        console.error('Error details:', err.message, err.status);
        this.loading = false;
        return of([]);
      })
    ).subscribe();
  }

  saveTask(): void {
    console.log('1. Bắt đầu saveTask');
    console.log('   taskForm:', this.taskForm);
    console.log('   deadlineDate:', this.deadlineDate, 'deadlineTime:', this.deadlineTime);

    if (!this.taskForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề!');
      return;
    }

    // Kết hợp date và time thành deadline
    if (this.deadlineDate) {
      this.taskForm.deadline = `${this.deadlineDate}T${this.deadlineTime}:00`;
      console.log('   deadline sau khi gộp:', this.taskForm.deadline);
    }

    if (this.isEditMode) {
      console.log('2. Đang UPDATE task:', this.taskForm.id);
      this.http.put(`${this.apiUrl}/${this.taskForm.id}`, this.taskForm).pipe(
        tap(() => {
          console.log('3. Update thành công');
          this.loadTasks();
          this.resetForm();
        }),
        catchError(err => {
          console.error('Lỗi khi cập nhật:', err);
          return of(null);
        })
      ).subscribe();
    } else {
      console.log('2. Đang tạo mới task');
      const newTask = {
        ...this.taskForm,
        createdAt: this.getLocalDateTime()
      };
      console.log('   newTask sẽ gửi:', newTask);

      this.http.post(this.apiUrl, newTask).pipe(
        tap((res) => {
          console.log('3. Create thành công, response:', res);
          this.loadTasks();
          this.resetForm();
        }),
        catchError(err => {
          console.error('Lỗi khi thêm mới:', err);
          console.error('   Status:', err.status, 'Message:', err.message);
          return of(null);
        })
      ).subscribe();
    }
  }

  editTask(task: Task): void {
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
    if (confirm('Bạn có chắc muốn xóa task này?')) {
      this.http.delete(`${this.apiUrl}/${id}`).pipe(
        tap(() => this.loadTasks()),
        catchError(err => {
          console.error('Lỗi khi xóa:', err);
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
}
