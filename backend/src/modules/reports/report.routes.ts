import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import db from '../../config/database';
import { successResponse } from '../../utils/response';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';

const router = Router();
router.use(authenticate);

async function getAttendanceReport(userId: number, role: string, query: any) {
  const { start_date, end_date } = query;
  const today = format(new Date(), 'yyyy-MM-dd');
  const start = start_date || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const end = end_date || today;

  let q = db('attendance')
    .join('users', 'attendance.user_id', 'users.id')
    .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
    .leftJoin('attendance_verifications', (qb) => {
      qb.on('attendance_verifications.attendance_id', 'attendance.id')
        .andOn(db.raw('attendance_verifications.verification_type = ?', ['CHECK_IN']));
    })
    .select(
      db.raw("users.first_name || ' ' || users.last_name as employee_name"),
      'users.employee_code',
      'attendance.attendance_date',
      'work_modes.name as work_mode',
      'attendance.check_in_time',
      'attendance.check_out_time',
      'attendance.total_work_minutes',
      'attendance.status',
      'attendance_verifications.verification_status',
    )
    .whereBetween('attendance.attendance_date', [start, end]);

  if (role === 'EMPLOYEE') q = q.where('attendance.user_id', userId);
  else if (role === 'MANAGER') {
    const ids = await db('users').where('manager_id', userId).pluck('id');
    q = q.whereIn('attendance.user_id', ids);
  }

  return q.orderBy(['attendance.attendance_date', 'users.first_name']);
}

router.get('/attendance', async (req: any, res, next) => {
  try {
    const rows = await getAttendanceReport(req.user.id, req.user.role, req.query);
    return successResponse(res, rows);
  } catch (err) { next(err); }
});

router.get('/timesheet', async (req: any, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date || format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = end_date || format(new Date(), 'yyyy-MM-dd');

    let q = db('timesheets')
      .join('users', 'timesheets.user_id', 'users.id')
      .join('projects', 'timesheets.project_id', 'projects.id')
      .leftJoin('tasks', 'timesheets.task_id', 'tasks.id')
      .select(
        db.raw("users.first_name || ' ' || users.last_name as employee_name"),
        'users.employee_code',
        'projects.name as project_name',
        'tasks.name as task_name',
        'timesheets.date',
        'timesheets.hours',
        'timesheets.overtime_hours',
        'timesheets.status',
      )
      .whereBetween('timesheets.date', [start, end]);

    if (req.user.role === 'EMPLOYEE') q = q.where('timesheets.user_id', req.user.id);
    return successResponse(res, await q.orderBy(['timesheets.date', 'users.first_name']));
  } catch (err) { next(err); }
});

router.get('/leave', async (req: any, res, next) => {
  try {
    let q = db('leave_requests')
      .join('users', 'leave_requests.user_id', 'users.id')
      .join('leave_types', 'leave_requests.leave_type_id', 'leave_types.id')
      .select(
        db.raw("users.first_name || ' ' || users.last_name as employee_name"),
        'users.employee_code',
        'leave_types.name as leave_type',
        'leave_requests.start_date', 'leave_requests.end_date',
        'leave_requests.total_days', 'leave_requests.status',
      );

    if (req.user.role === 'EMPLOYEE') q = q.where('leave_requests.user_id', req.user.id);
    return successResponse(res, await q.orderBy('leave_requests.created_at', 'desc'));
  } catch (err) { next(err); }
});

router.get('/exceptions', authorize('MANAGER', 'ADMIN'), async (req: any, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    let q = db('attendance_exceptions')
      .join('users', 'attendance_exceptions.user_id', 'users.id')
      .select(
        db.raw("users.first_name || ' ' || users.last_name as employee_name"),
        'users.employee_code',
        'attendance_exceptions.exception_type',
        'attendance_exceptions.severity',
        'attendance_exceptions.exception_date',
        'attendance_exceptions.status',
        'attendance_exceptions.description',
      );
    if (start_date) q = q.where('exception_date', '>=', start_date);
    if (end_date) q = q.where('exception_date', '<=', end_date);
    if (req.user.role === 'MANAGER') {
      const ids = await db('users').where('manager_id', req.user.id).pluck('id');
      q = q.whereIn('attendance_exceptions.user_id', ids);
    }
    return successResponse(res, await q.orderBy('attendance_exceptions.exception_date', 'desc'));
  } catch (err) { next(err); }
});

// Export endpoint â€” supports format=csv and format=excel
router.get('/export', async (req: any, res, next) => {
  try {
    const { type = 'attendance', format: fmt = 'csv' } = req.query;
    const rows = await getAttendanceReport(req.user.id, req.user.role, req.query);

    const data = rows.map((r: any) => ({
      'Employee': r.employee_name,
      'Employee Code': r.employee_code,
      'Date': r.attendance_date,
      'Work Mode': r.work_mode,
      'Check In': r.check_in_time ? format(new Date(r.check_in_time), 'HH:mm:ss') : '-',
      'Check Out': r.check_out_time ? format(new Date(r.check_out_time), 'HH:mm:ss') : '-',
      'Work Minutes': r.total_work_minutes,
      'Status': r.status,
      'Verification': r.verification_status || '-',
    }));

    if (fmt === 'csv') {
      const header = `# EvoluXion Software Solutions — WorkMonitor HRMS\n# Attendance Report — Generated: ${format(new Date(), 'dd MMM yyyy hh:mm a')}\n#\n`;
      const csv = stringify(data, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="evoluxion-attendance-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
      return res.send(header + csv);
    }

    // Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EvoluXion Software Solutions';
    workbook.company = 'EvoluXion Software Solutions';

    const sheet = workbook.addWorksheet('Attendance Report');

    if (data.length > 0) {
      // Company header rows
      sheet.mergeCells('A1:I1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'EvoluXion Software Solutions';
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E40AF' } };
      titleCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('A2:I2');
      const subtitleCell = sheet.getCell('A2');
      subtitleCell.value = `Attendance Report — Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`;
      subtitleCell.font = { size: 10, italic: true, color: { argb: 'FF6B7280' } };
      subtitleCell.alignment = { horizontal: 'center' };

      sheet.addRow([]); // blank row

      // Column headers (row 4)
      const headerRow = sheet.addRow(Object.keys(data[0]));
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
        };
      });

      // Set column widths
      sheet.columns = Object.keys(data[0]).map((k) => ({
        key: k, width: k === 'Employee' ? 25 : 18,
      }));

      // Data rows with alternating background
      data.forEach((row: any, idx: number) => {
        const dataRow = sheet.addRow(Object.values(row));
        if (idx % 2 === 0) {
          dataRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
          });
        }
      });

      // Footer
      sheet.addRow([]);
      const footerRow = sheet.addRow(['Powered by EvoluXion Software Solutions — WorkMonitor HRMS']);
      sheet.mergeCells(`A${footerRow.number}:I${footerRow.number}`);
      footerRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF9CA3AF' } };
      footerRow.getCell(1).alignment = { horizontal: 'center' };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="evoluxion-attendance-${format(new Date(), 'yyyy-MM-dd')}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

export default router;
