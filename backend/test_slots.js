import pool from './src/config/db.js';
import * as EventService from './src/services/eventService.js';
import 'dotenv/config';

async function testCreateEventWithSlots() {
  try {
    console.log('Testing Create Event with Time Slots...');
    
    // Create a city first to link the event
    const [cityRes] = await pool.query("INSERT INTO cities (name, state, created_at) VALUES ('TestSlotCity', 'TS', NOW())");
    const cityId = cityRes.insertId;
    console.log('Created City ID:', cityId);

    // Create Event with Time Slots
    const eventData = {
      city_id: cityId,
      location: 'Slot Test Location',
      start_date: '2025-06-01',
      end_date: '2025-06-03', // 3 days
      max_capacity: 50,
      notes: 'Testing slots',
      startTime: '09:00 AM',
      endTime: '05:00 PM'
    };

    const createdEvent = await EventService.createEvent(eventData);
    console.log('Created Event:', createdEvent);

    // Verify Time Slots
    const [slots] = await pool.query('SELECT * FROM time_slots WHERE event_id = ?', [createdEvent.id]);
    console.log('Time Slots Created:', slots.length);
    console.log('Slots Data:', slots);

    if (slots.length === 3) {
      console.log('SUCCESS: 3 slots created for 3 days.');
      const firstSlot = slots[0];
      if (firstSlot.slot_time === '09:00:00' && firstSlot.max_per_slot === 50) {
        console.log('SUCCESS: Slot time and capacity are correct.');
      } else {
        console.error('FAILURE: Incorrect slot data:', firstSlot);
      }
    } else {
      console.error('FAILURE: Expected 3 slots, found', slots.length);
    }

    // Cleanup
    await pool.query('DELETE FROM time_slots WHERE event_id = ?', [createdEvent.id]);
    await pool.query('DELETE FROM events WHERE id = ?', [createdEvent.id]);
    await pool.query('DELETE FROM cities WHERE id = ?', [cityId]);
    console.log('Cleanup complete.');

  } catch (e) {
    console.error('Test Failed:', e);
  } finally {
    process.exit();
  }
}

testCreateEventWithSlots();
