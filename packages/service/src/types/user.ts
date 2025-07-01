export interface RegisterBody {
  userName: string;
  loginName: string;
  password: string;
  avatar?: string;
}

export interface LoginBody {
  loginName: string;
  password: string;
}

export interface UpdateUserBody {
  userName?: string;
  password?: string;
  avatar?: string;
}
