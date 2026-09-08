import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import db from '../../config/database';
import { successResponse } from '../../utils/response';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';

const router = Router();
router.use(authenticate);

// ─── Intent detection ────────────────────────────────────────────────────────

function detectIntent(msg: string): string {
  const m = msg.toLowerCase();

  if (/\b(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)\b/.test(m)) return 'greeting';
  if (/\b(bye|goodbye|see you|cya|exit|quit)\b/.test(m)) return 'farewell';
  if (/\b(help|what can you do|commands|options|features)\b/.test(m)) return 'help';

  if (/\b(check[\s-]?in|checked in|clock in|start work|attendance today|my attendance)\b/.test(m)) return 'my_attendance';
  if (/\b(check[\s-]?out|clock out|end work|finish work)\b/.test(m)) return 'my_attendance';
  if (/\b(attendance history|past attendance|last.*days.*attendance|attendance.*week|attendance.*month)\b/.test(m)) return 'attendance_history';

  if (/\b(my\s+task|assigned\s+task|pending\s+task|task.*due|what.*task|task.*today|show.*task|open\s+task)\b/.test(m)) return 'my_tasks';
  if (/\b(overdue task|late task|missed.*deadline)\b/.test(m)) return 'overdue_tasks';
  if (/\b(complete.*task|finished.*task|done.*task)\b/.test(m)) return 'completed_tasks';

  if (/\b(timesheet|hours.*log|log.*hours|submitted.*time|time.*entry)\b/.test(m)) return 'my_timesheets';
  if (/\b(leave balance|remaining leave|how many.*leave|days.*off|leave left)\b/.test(m)) return 'leave_balance';
  if (/\b(apply.*leave|request.*leave|take.*leave|need.*leave)\b/.test(m)) return 'apply_leave_guide';
  if (/\b(leave status|my leave|leave request|pending leave)\b/.test(m)) return 'my_leave';

  if (/\b(team.*attendance|who.*present|team.*today|team.*checkin|my team)\b/.test(m)) return 'team_attendance';
  if (/\b(team.*leave|who.*leave|team.*absent)\b/.test(m)) return 'team_leave';
  if (/\b(pending.*approval|approve.*timesheet|pending.*timesheet)\b/.test(m)) return 'pending_approvals';
  if (/\b(exception|late.*checkin|missing.*checkout|attendance.*issue)\b/.test(m)) return 'exceptions';

  if (/\b(kpi|performance|attendance.*rate|score|metrics)\b/.test(m)) return 'kpi';
  if (/\b(notification|alert|unread)\b/.test(m)) return 'notifications';
  if (/\b(project|my project|assigned project)\b/.test(m)) return 'my_projects';

  if (/\b(work.*hour|working.*hour|standard.*hour|office.*time|shift)\b/.test(m)) return 'work_hours';
  if (/\b(who am i|my profile|my role|my info|my name)\b/.test(m)) return 'my_profile';

  return 'unknown';
}

// ─── Response builders ────────────────────────────────────────────────────────

async function buildResponse(intent: string, userId: number, role: string, user: any): Promise<string> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();
  const firstName = user.first_name;

  switch (intent) {

    case 'greeting': {
      const hour = now.getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const attendance = await db('attendance').where({ user_id: userId, attendance_date: today }).first();
      let status = '';
      if (attendance?.status === 'CHECKED_IN') {
        const checkInTime = format(new Date(attendance.check_in_time), 'hh:mm a');
        status = `\n\n✅ You checked in at **${checkInTime}** today.`;
      } else if (attendance?.status === 'CHECKED_OUT') {
        status = `\n\n✔️ You completed your workday today!`;
      } else {
        status = `\n\n⚠️ You haven't checked in yet today.`;
      }
      return `${greet}, **${firstName}**! 👋 I'm your WorkMonitor assistant.${status}\n\nHow can I help you?`;
    }

    case 'farewell':
      return `Goodbye, ${firstName}! Have a great day! 👋`;

    case 'help':
      return `Here's what I can help you with:\n\n` +
        `**📋 Attendance**\n• "My attendance today"\n• "Attendance history"\n\n` +
        `**✅ Tasks**\n• "My tasks"\n• "Overdue tasks"\n• "Completed tasks"\n\n` +
        `**📄 Timesheets**\n• "My timesheets"\n• "Pending timesheets"\n\n` +
        `**🏖️ Leave**\n• "My leave balance"\n• "My leave requests"\n• "How to apply for leave"\n\n` +
        (role !== 'EMPLOYEE' ? `**👥 Team (Manager)**\n• "Team attendance today"\n• "Pending approvals"\n• "Exceptions"\n\n` : '') +
        `**📊 Other**\n• "My KPI"\n• "My projects"\n• "My notifications"`;

    case 'my_attendance': {
      const att = await db('attendance')
        .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
        .select('attendance.*', 'work_modes.name as work_mode_name')
        .where({ 'attendance.user_id': userId, attendance_date: today })
        .first();

      if (!att) return `📋 You haven't checked in today yet.\n\nGo to **Attendance → Check In** to start your workday.`;

      const checkIn = format(new Date(att.check_in_time), 'hh:mm a');
      if (att.status === 'CHECKED_IN') {
        const mins = Math.floor((now.getTime() - new Date(att.check_in_time).getTime()) / 60000);
        const h = Math.floor(mins / 60), m = mins % 60;
        return `📋 **Today's Attendance**\n\n` +
          `• Status: 🟢 Checked In\n` +
          `• Check-in: **${checkIn}**\n` +
          `• Work mode: ${att.work_mode_name}\n` +
          `• Duration so far: **${h}h ${m}m**\n\n` +
          `Don't forget to check out when you're done!`;
      } else {
        const checkOut = format(new Date(att.check_out_time), 'hh:mm a');
        const h = Math.floor(att.total_work_minutes / 60), m = att.total_work_minutes % 60;
        return `📋 **Today's Attendance**\n\n` +
          `• Status: ✅ Checked Out\n` +
          `• Check-in: **${checkIn}**\n` +
          `• Check-out: **${checkOut}**\n` +
          `• Work mode: ${att.work_mode_name}\n` +
          `• Total hours: **${h}h ${m}m**` +
          (att.overtime_minutes > 0 ? `\n• Overtime: ${Math.floor(att.overtime_minutes / 60)}h ${att.overtime_minutes % 60}m ⭐` : '');
      }
    }

    case 'attendance_history': {
      const last7 = format(subDays(now, 7), 'yyyy-MM-dd');
      const records = await db('attendance')
        .join('work_modes', 'attendance.work_mode_id', 'work_modes.id')
        .select('attendance.attendance_date', 'attendance.status', 'attendance.total_work_minutes', 'work_modes.code as wm')
        .where('attendance.user_id', userId)
        .where('attendance.attendance_date', '>=', last7)
        .orderBy('attendance.attendance_date', 'desc')
        .limit(7);

      if (!records.length) return `📅 No attendance records found for the last 7 days.`;

      const lines = records.map((r: any) => {
        const d = format(new Date(r.attendance_date), 'EEE, dd MMM');
        const h = Math.floor(r.total_work_minutes / 60), m = r.total_work_minutes % 60;
        const icon = r.status === 'CHECKED_OUT' ? '✅' : r.status === 'CHECKED_IN' ? '🟢' : '❌';
        return `${icon} ${d} — ${h}h ${m}m (${r.wm})`;
      });

      return `📅 **Last 7 Days Attendance**\n\n${lines.join('\n')}`;
    }

    case 'my_tasks': {
      const tasks = await db('tasks')
        .join('projects', 'tasks.project_id', 'projects.id')
        .select('tasks.name', 'tasks.status', 'tasks.priority', 'tasks.due_date', 'tasks.progress_percentage', 'projects.name as project_name')
        .where('tasks.assigned_to', userId)
        .whereNotIn('tasks.status', ['COMPLETED', 'CANCELLED'])
        .orderBy('tasks.due_date', 'asc')
        .limit(5);

      if (!tasks.length) return `✅ You have no active tasks right now. Great work!`;

      const lines = tasks.map((t: any) => {
        const due = t.due_date ? ` · Due ${format(new Date(t.due_date), 'dd MMM')}` : '';
        const prio = t.priority === 'CRITICAL' ? '🔴' : t.priority === 'HIGH' ? '🟠' : t.priority === 'MEDIUM' ? '🟡' : '⚪';
        return `${prio} **${t.name}** (${t.project_name})${due} — ${t.progress_percentage}%`;
      });

      const total = await db('tasks').where('assigned_to', userId).whereNotIn('status', ['COMPLETED', 'CANCELLED']).count('id as c').first();
      const count = Number((total as any)?.c || 0);
      return `📌 **Your Active Tasks** (${count} total)\n\n${lines.join('\n')}\n\nVisit **Tasks** page to update progress.`;
    }

    case 'overdue_tasks': {
      const tasks = await db('tasks')
        .join('projects', 'tasks.project_id', 'projects.id')
        .select('tasks.name', 'tasks.due_date', 'tasks.priority', 'projects.name as project_name')
        .where('tasks.assigned_to', userId)
        .whereNotIn('tasks.status', ['COMPLETED', 'CANCELLED'])
        .where('tasks.due_date', '<', today)
        .orderBy('tasks.due_date', 'asc');

      if (!tasks.length) return `✅ No overdue tasks! You're on track.`;

      const lines = tasks.map((t: any) => {
        const daysLate = Math.floor((now.getTime() - new Date(t.due_date).getTime()) / 86400000);
        return `🔴 **${t.name}** (${t.project_name}) — ${daysLate} day${daysLate !== 1 ? 's' : ''} overdue`;
      });

      return `⚠️ **Overdue Tasks (${tasks.length})**\n\n${lines.join('\n')}\n\nPlease update progress or contact your manager.`;
    }

    case 'completed_tasks': {
      const tasks = await db('tasks')
        .join('projects', 'tasks.project_id', 'projects.id')
        .select('tasks.name', 'tasks.updated_at', 'projects.name as project_name')
        .where('tasks.assigned_to', userId)
        .where('tasks.status', 'COMPLETED')
        .orderBy('tasks.updated_at', 'desc')
        .limit(5);

      if (!tasks.length) return `No completed tasks found yet.`;

      const lines = tasks.map((t: any) => `✅ **${t.name}** (${t.project_name})`);
      const total = await db('tasks').where({ assigned_to: userId, status: 'COMPLETED' }).count('id as c').first();
      return `🏆 **Recently Completed Tasks** (${(total as any)?.c} total)\n\n${lines.join('\n')}`;
    }

    case 'my_timesheets': {
      const startMonth = format(startOfMonth(now), 'yyyy-MM-dd');
      const [drafts, submitted, approved] = await Promise.all([
        db('timesheets').where({ user_id: userId, status: 'DRAFT' }).count('id as c').first(),
        db('timesheets').where({ user_id: userId, status: 'SUBMITTED' }).count('id as c').first(),
        db('timesheets').where({ user_id: userId, status: 'APPROVED' }).whereBetween('date', [startMonth, today]).count('id as c').first(),
      ]);
      const totalHours = await db('timesheets').where({ user_id: userId, status: 'APPROVED' }).whereBetween('date', [startMonth, today]).sum('hours as total').first();

      return `📄 **Your Timesheets (This Month)**\n\n` +
        `• Approved hours: **${Number((totalHours as any)?.total || 0).toFixed(1)}h**\n` +
        `• Approved entries: ${(approved as any)?.c || 0}\n` +
        `• Submitted (pending): ${(submitted as any)?.c || 0}\n` +
        `• Draft (unsent): ${(drafts as any)?.c || 0}\n\n` +
        ((drafts as any)?.c > 0 ? `⚠️ You have ${(drafts as any).c} draft timesheet(s) — don't forget to submit them!` : `✅ All timesheets are submitted.`);
    }

    case 'leave_balance': {
      const year = now.getFullYear();
      const balances = await db('leave_balances')
        .join('leave_types', 'leave_balances.leave_type_id', 'leave_types.id')
        .select('leave_types.name', 'leave_balances.allocated_days', 'leave_balances.used_days')
        .where({ 'leave_balances.user_id': userId, year });

      if (!balances.length) return `No leave balance found for ${year}.`;

      const lines = balances.map((b: any) => {
        const remaining = b.allocated_days - b.used_days;
        const bar = '█'.repeat(Math.round((remaining / b.allocated_days) * 8)) + '░'.repeat(8 - Math.round((remaining / b.allocated_days) * 8));
        return `**${b.name}**: ${remaining}/${b.allocated_days} days [${bar}]`;
      });

      return `🏖️ **Leave Balance (${year})**\n\n${lines.join('\n')}`;
    }

    case 'apply_leave_guide':
      return `📝 **How to Apply for Leave**\n\n` +
        `1. Go to **Leave → Apply for Leave** in the sidebar\n` +
        `2. Select **Leave Type** (Annual, Sick, Casual, etc.)\n` +
        `3. Choose **Start Date** and **End Date**\n` +
        `4. Enter a **Reason** (min 10 characters)\n` +
        `5. Click **Submit Request**\n\n` +
        `Your manager will be notified and will approve or reject the request.\n` +
        `You can track status under **Leave → Leave History**.`;

    case 'my_leave': {
      const requests = await db('leave_requests')
        .join('leave_types', 'leave_requests.leave_type_id', 'leave_types.id')
        .select('leave_requests.status', 'leave_requests.start_date', 'leave_requests.end_date', 'leave_requests.total_days', 'leave_types.name as type_name')
        .where('leave_requests.user_id', userId)
        .orderBy('leave_requests.created_at', 'desc')
        .limit(5);

      if (!requests.length) return `You have no leave requests on record.`;

      const icons: Record<string, string> = { PENDING: '🟡', APPROVED: '✅', REJECTED: '❌', CANCELLED: '⚫' };
      const lines = requests.map((r: any) => {
        const icon = icons[r.status] || '⚪';
        return `${icon} **${r.type_name}** · ${format(new Date(r.start_date), 'dd MMM')} – ${format(new Date(r.end_date), 'dd MMM')} (${r.total_days}d) · ${r.status}`;
      });

      return `🏖️ **Your Recent Leave Requests**\n\n${lines.join('\n')}`;
    }

    case 'team_attendance': {
      if (role === 'EMPLOYEE') return `You don't have access to team attendance data.`;

      const teamIds: number[] = role === 'TEAM_LEAD'
        ? await db('users').where('team_lead_id', userId).pluck('id')
        : role === 'MANAGER'
          ? await db('users').where('manager_id', userId).pluck('id')
          : await db('users').where('status', 'ACTIVE').pluck('id');

      const attended = await db('attendance')
        .whereIn('user_id', teamIds)
        .where('attendance_date', today)
        .select('user_id', 'status');

      const total = teamIds.length;
      const present = attended.filter((a: any) => a.status !== 'ABSENT').length;
      const checkedOut = attended.filter((a: any) => a.status === 'CHECKED_OUT').length;
      const absent = total - present;

      return `👥 **Team Attendance Today**\n\n` +
        `• Total members: **${total}**\n` +
        `• Present: **${present}** ✅\n` +
        `• Checked out: **${checkedOut}**\n` +
        `• Absent: **${absent}** ❌\n\n` +
        `View details on the **Team Attendance** page.`;
    }

    case 'pending_approvals': {
      if (role === 'EMPLOYEE') return `Approval management is for managers and team leads.`;

      const teamIds: number[] = role === 'TEAM_LEAD'
        ? await db('users').where('team_lead_id', userId).pluck('id')
        : await db('users').where('manager_id', userId).pluck('id');

      const [leave, timesheets] = await Promise.all([
        db('leave_requests').whereIn('user_id', teamIds).where('status', 'PENDING').count('id as c').first(),
        db('timesheets').whereIn('user_id', teamIds).where('status', 'SUBMITTED').count('id as c').first(),
      ]);

      const lc = Number((leave as any)?.c || 0);
      const tc = Number((timesheets as any)?.c || 0);
      const total = lc + tc;

      if (total === 0) return `✅ No pending approvals! Your team is up to date.`;

      return `⏳ **Pending Approvals**\n\n` +
        `• Leave requests: **${lc}** ${lc > 0 ? '👉 Go to Leave → Approvals' : ''}\n` +
        `• Timesheets: **${tc}** ${tc > 0 ? '👉 Go to Timesheets' : ''}`;
    }

    case 'exceptions': {
      if (role === 'EMPLOYEE') {
        const myExc = await db('attendance_exceptions')
          .where({ user_id: userId, status: 'OPEN' })
          .count('id as c').first();
        const count = Number((myExc as any)?.c || 0);
        return count > 0
          ? `⚠️ You have **${count} open attendance exception(s)**.\nCheck the Exceptions section for details.`
          : `✅ You have no open attendance exceptions.`;
      }

      const teamIds: number[] = role === 'TEAM_LEAD'
        ? await db('users').where('team_lead_id', userId).pluck('id')
        : await db('users').where('manager_id', userId).pluck('id');

      const exc = await db('attendance_exceptions')
        .whereIn('user_id', teamIds)
        .where('status', 'OPEN')
        .select('exception_type')
        .orderBy('created_at', 'desc')
        .limit(50);

      if (!exc.length) return `✅ No open exceptions in your team.`;

      const counts: Record<string, number> = {};
      exc.forEach((e: any) => { counts[e.exception_type] = (counts[e.exception_type] || 0) + 1; });

      const lines = Object.entries(counts).map(([type, c]) => {
        const label = type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        return `• ${label}: **${c}**`;
      });

      return `⚠️ **Open Team Exceptions (${exc.length})**\n\n${lines.join('\n')}\n\nReview on the **Exceptions** page.`;
    }

    case 'kpi': {
      const startMonth = format(startOfMonth(now), 'yyyy-MM-dd');
      const [attResult, taskResult, tsResult] = await Promise.all([
        db('attendance').where('user_id', userId).whereBetween('attendance_date', [startMonth, today]).count('id as c').first(),
        db('tasks').where('assigned_to', userId).where('status', 'COMPLETED').count('id as c').first(),
        db('tasks').where('assigned_to', userId).count('id as c').first(),
      ]);

      const workingDays = Math.floor((now.getTime() - new Date(startMonth).getTime()) / 86400000);
      const presentDays = Number((attResult as any)?.c || 0);
      const attRate = workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(0) : '0';
      const completedTasks = Number((taskResult as any)?.c || 0);
      const totalTasks = Number((tsResult as any)?.c || 0);
      const taskRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(0) : '0';

      const attBar = '█'.repeat(Math.round(Number(attRate) / 10)) + '░'.repeat(10 - Math.round(Number(attRate) / 10));
      const taskBar = '█'.repeat(Math.round(Number(taskRate) / 10)) + '░'.repeat(10 - Math.round(Number(taskRate) / 10));

      return `📊 **Your KPIs (This Month)**\n\n` +
        `📅 Attendance Rate\n${attBar} **${attRate}%** (${presentDays}/${workingDays} days)\n\n` +
        `✅ Task Completion\n${taskBar} **${taskRate}%** (${completedTasks}/${totalTasks} tasks)`;
    }

    case 'notifications': {
      const unread = await db('notifications').where({ user_id: userId, is_read: false }).count('id as c').first();
      const recent = await db('notifications').where('user_id', userId).orderBy('created_at', 'desc').limit(3);
      const count = Number((unread as any)?.c || 0);

      if (!recent.length) return `🔔 No notifications yet.`;

      const lines = recent.map((n: any) => `• **${n.title}**: ${n.message}`);
      return `🔔 **Notifications** (${count} unread)\n\n${lines.join('\n')}\n\nView all in the **Notifications** page.`;
    }

    case 'my_projects': {
      const projects = await db('projects')
        .join('tasks', 'projects.id', 'tasks.project_id')
        .where('tasks.assigned_to', userId)
        .distinct('projects.id', 'projects.name', 'projects.status')
        .limit(5);

      if (!projects.length) return `📁 No projects assigned to you currently.`;

      const lines = projects.map((p: any) => {
        const icon = p.status === 'ACTIVE' ? '🟢' : p.status === 'COMPLETED' ? '✅' : '🟡';
        return `${icon} **${p.name}** (${p.status})`;
      });

      return `📁 **Your Projects**\n\n${lines.join('\n')}`;
    }

    case 'work_hours': {
      const [startTime, endTime, hours, grace] = await Promise.all([
        db('system_settings').where('setting_key', 'standard_start_time').first(),
        db('system_settings').where('setting_key', 'standard_end_time').first(),
        db('system_settings').where('setting_key', 'standard_work_hours').first(),
        db('system_settings').where('setting_key', 'grace_period_minutes').first(),
      ]);

      return `🕘 **Work Hours**\n\n` +
        `• Start time: **${startTime?.setting_value || '09:00'}**\n` +
        `• End time: **${endTime?.setting_value || '18:00'}**\n` +
        `• Standard hours: **${hours?.setting_value || '8'}h/day**\n` +
        `• Grace period: **${grace?.setting_value || '15'} minutes**`;
    }

    case 'my_profile':
      return `👤 **Your Profile**\n\n` +
        `• Name: **${user.first_name} ${user.last_name}**\n` +
        `• Role: **${user.role?.replace('_', ' ')}**\n` +
        `• Email: ${user.email}\n` +
        `• Employee Code: ${user.employee_code}`;

    case 'unknown':
    default:
      return `I'm not sure I understand that. Try asking:\n\n` +
        `• "My attendance today"\n` +
        `• "My tasks"\n` +
        `• "Leave balance"\n` +
        `• "My timesheets"\n` +
        `• "My KPI"\n\nOr type **help** to see everything I can do.`;
  }
}

// ─── POST /api/chatbot/message ────────────────────────────────────────────────

router.post('/message', async (req: any, res, next) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const userId = req.user.id;
    const role = req.user.role;

    // Load full user object
    const userRecord = await db('users')
      .join('roles', 'users.role_id', 'roles.id')
      .select('users.*', 'roles.name as role')
      .where('users.id', userId)
      .first();

    const intent = detectIntent(message.trim());
    const reply = await buildResponse(intent, userId, role, userRecord);

    return successResponse(res, { reply, intent }, 'OK');
  } catch (err) {
    next(err);
  }
});

export default router;
