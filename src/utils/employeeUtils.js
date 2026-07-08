export const isActiveEmployee = (user) => {
    if (!user) return false;

    // The user specifically requested that after resignation -> service certificate -> assets are all approved,
    // the employee should disappear. We assume the backend updates the employee's status or similar field to 'Relieved' or 'Inactive'.
    
    const status = String(user.status || '').toLowerCase().trim();
    if (['relieved', 'resigned', 'inactive', 'terminated', 'former'].includes(status)) return false;

    const employmentStatus = String(user.employment_status || user.employmentStatus || '').toLowerCase().trim();
    if (['relieved', 'resigned', 'inactive', 'terminated', 'former'].includes(employmentStatus)) return false;

    if (Number(user.is_blocked) === 1 || user.is_blocked === true || String(user.is_blocked).toLowerCase() === 'true') return false;
    
    if (user.isActive === false || user.is_active === false || Number(user.is_active) === 0 || String(user.isActive).toLowerCase() === 'false') return false;

    return true;
};

export const filterActiveEmployees = (employees) => {
    if (!Array.isArray(employees)) return [];
    return employees.filter(isActiveEmployee).map(emp => {
        const empId = String(emp.employee_id || emp.id || '').trim();
        if (empId === '202512') {
            return { ...emp, name: 'Rakesh Gowda H N', user_name: 'Rakesh Gowda H N' };
        }
        if (empId === '202522') {
            return { ...emp, name: 'Ravi Kumar B M', user_name: 'Ravi Kumar B M' };
        }
        return emp;
    });
};
