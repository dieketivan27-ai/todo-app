const Notification = require('../models/notification.model');

exports.getAll = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!notification) return res.status(404).json({ success: false, message: 'Non trouvé' });
    
    await notification.update({ is_read: true });
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!notification) return res.status(404).json({ success: false, message: 'Non trouvé' });
    
    await notification.destroy();
    res.json({ success: true, message: 'Supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
