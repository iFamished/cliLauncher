
export interface ModrinthLoader {
  icon: string;
  name: string;
  supported_project_types: string[];
}

export interface ModrinthCategory {
  icon: string;
  name: string;
  project_type: string;
  header: string;
}
