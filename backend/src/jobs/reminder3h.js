// 3h-before reminders depended on time slots and fixed hours, which have been
// removed from the product. This job is now a no-op and kept only for
// compatibility with older PM2 configurations.

function schedule() {
  // intentionally empty
}

export { schedule };
export default { schedule };