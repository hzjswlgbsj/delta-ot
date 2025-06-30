export interface RegisterBody {
  userId: string;
  userName: string;
  password: string;
  avatar?: string;
}

export interface LoginBody {
  userId: string;
  password: string;
}

export interface UpdateUserBody {
  userName?: string;
  password?: string;
  avatar?: string;
}
