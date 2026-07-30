export interface ToDoItem {
  id?: number;
  title: string;
  isCompleted?: boolean;
  assigneeId: number;
  createdDate?: string;
  isOptimistic?: boolean;
}
