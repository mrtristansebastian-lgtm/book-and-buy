const cappedMaxInstances = (value, fallback) => Math.min(
  20,
  Math.max(1, Number(value || fallback))
);

module.exports = {
  cappedMaxInstances
};
