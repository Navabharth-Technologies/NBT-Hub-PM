export const THEMES = {
  superadmin: { color: '#312e81', contrast: '#e0e7ff', label: 'SUPER ADMIN' },
  hr: { color: '#86198f', contrast: '#f0abfc', label: 'Human Resources' },
  projectmanager: { color: '#312e81', contrast: '#e0e7ff', label: 'PROJECT MANAGER' },
  teamleader: { color: '#0f766e', contrast: '#99f6e4', label: 'TEAM LEADER' },
  employee: { color: '#111827', contrast: '#e5e7eb', label: 'EMPLOYEE' }
};

export const getTheme = (role) => THEMES[role] || THEMES.employee;
