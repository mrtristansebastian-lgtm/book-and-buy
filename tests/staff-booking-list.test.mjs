import test from 'node:test';
import assert from 'node:assert/strict';
import { groupStaffBookings, pendingDemoRescheduleIds } from '../src/features/schedule/utils/staffBookingList.js';
const staff = [{id:'s',name:'Sam'}];
const bookings = [{id:'a',staffId:'s',date:'2026-10-03',status:'pending',time:'10:00'}, {id:'b',staffId:'s',date:'2026-10-03',status:'confirmed',time:'09:00'}, {id:'c',date:'2026-10-03',status:'waitlist'}, {id:'d',date:'2026-10-04',status:'confirmed'}, {id:'e',date:'2026-10-03',status:'cancelled'}];
test('selected date groups active bookings, orders times and preserves unassigned',()=>{
 const groups=groupStaffBookings(bookings,staff,{day:'2026-10-03'});
 assert.deepEqual(groups.map(g=>g.items.map(b=>b.id)),[['b','a'],['c']]);
});
test('staff and status filters combine without changing calendar data',()=>{
 assert.deepEqual(groupStaffBookings(bookings,staff,{day:'2026-10-03',staffId:'s',filter:'pending'})[0].items.map(b=>b.id),['a']);
 assert.equal(groupStaffBookings(bookings,staff,{day:'2026-10-03',filter:'reschedule',pendingIds:new Set(['b'])})[0].items[0].id,'b');
});
test('only latest proposal revision determines reschedule request state',()=>{
 const ids=pendingDemoRescheduleIds([{bookingId:'a',messages:[{type:'reschedule',proposal:{status:'pending'}},{type:'reschedule',proposal:{status:'accepted'}}]},{bookingId:'b',messages:[{type:'reschedule',proposal:{status:'pending'}}]}]);
 assert.deepEqual([...ids],['b']);
});
