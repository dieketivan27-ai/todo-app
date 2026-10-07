const { getWeekPlanning } = require('../services/planning.service');

const getWeek = async (req, res) => {
  try {
    const date = req.query.date;
    const data = await getWeekPlanning(req.user.id, date);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Planning week error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getWeek };
