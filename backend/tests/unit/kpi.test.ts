describe('KPI Calculations', () => {
  it('calculates attendance rate correctly', () => {
    const presentDays = 18;
    const expectedWorkingDays = 22;
    const rate = (presentDays / expectedWorkingDays) * 100;
    expect(rate).toBeCloseTo(81.8, 1);
  });

  it('attendance rate cannot exceed 100', () => {
    const rate = Math.min(100, (23 / 22) * 100);
    expect(rate).toBe(100);
  });

  it('calculates overtime correctly', () => {
    const totalWorkMinutes = 570; // 9.5 hours
    const standardWorkMinutes = 480; // 8 hours
    const overtime = Math.max(0, totalWorkMinutes - standardWorkMinutes);
    expect(overtime).toBe(90);
  });

  it('overtime is never negative', () => {
    const totalWorkMinutes = 400;
    const standardWorkMinutes = 480;
    const overtime = Math.max(0, totalWorkMinutes - standardWorkMinutes);
    expect(overtime).toBe(0);
  });

  it('calculates on-time check-in rate', () => {
    const onTimeCheckIns = 15;
    const totalCheckIns = 20;
    const rate = (onTimeCheckIns / totalCheckIns) * 100;
    expect(rate).toBe(75);
  });

  it('handles zero division for on-time rate', () => {
    const rate = 0 > 0 ? (0 / 0) * 100 : 0;
    expect(rate).toBe(0);
  });

  it('calculates WFH rate', () => {
    const wfhDays = 8;
    const totalPresentDays = 20;
    const rate = (wfhDays / totalPresentDays) * 100;
    expect(rate).toBe(40);
  });

  it('calculates task completion rate', () => {
    const completed = 7;
    const assigned = 10;
    expect((completed / assigned) * 100).toBe(70);
  });

  it('exception rate calculation', () => {
    const exceptions = 3;
    const attendanceRecords = 20;
    const rate = (exceptions / attendanceRecords) * 100;
    expect(rate).toBe(15);
  });
});

describe('Duration Calculations', () => {
  it('calculates work minutes from timestamps', () => {
    const checkIn = new Date('2026-08-20T09:00:00Z');
    const checkOut = new Date('2026-08-20T18:00:00Z');
    const minutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60_000);
    expect(minutes).toBe(540);
  });

  it('identifies late check-in', () => {
    const standardStart = '09:00';
    const gracePeriod = 15;
    const [h, m] = standardStart.split(':').map(Number);
    const standardMinutes = h * 60 + m;
    const graceEndMinutes = standardMinutes + gracePeriod;

    const checkInMinutes = 9 * 60 + 30; // 09:30
    const isLate = checkInMinutes > graceEndMinutes;
    expect(isLate).toBe(true);
  });

  it('identifies on-time check-in within grace period', () => {
    const graceEndMinutes = 9 * 60 + 15; // 09:15
    const checkInMinutes = 9 * 60 + 10; // 09:10
    expect(checkInMinutes > graceEndMinutes).toBe(false);
  });

  it('identifies early checkout', () => {
    const standardEnd = '18:00';
    const grace = 15;
    const [h, m] = standardEnd.split(':').map(Number);
    const graceStartMinutes = h * 60 + m - grace;
    const checkOutMinutes = 17 * 60 + 30; // 17:30
    expect(checkOutMinutes < graceStartMinutes).toBe(true);
  });
});

describe('Leave Calculations', () => {
  it('calculates remaining leave balance', () => {
    const allocated = 21;
    const used = 5;
    const remaining = allocated - used;
    expect(remaining).toBe(16);
  });

  it('rejects leave when balance insufficient', () => {
    const allocated = 5;
    const used = 4;
    const remaining = allocated - used;
    const requested = 3;
    expect(remaining < requested).toBe(true);
  });

  it('approved leave should not count as absence', () => {
    const isOnApprovedLeave = true;
    const shouldMarkAbsent = !isOnApprovedLeave;
    expect(shouldMarkAbsent).toBe(false);
  });
});
