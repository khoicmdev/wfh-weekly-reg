import { ToDoItem } from "./todo";

export interface User {
  id?: number;
  username: string;
  todoItems?: ToDoItem[];
  createdDate?: string;
  isOptimistic?: boolean;
}
