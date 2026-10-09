const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Accès non autorisé, token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key');
    req.user = decoded; // { id: 1, email: '...' }

    // Renouvellement de la session si ce n'est pas une requête d'arrière-plan
    const isBackground = req.headers['x-background-request'] === 'true';
    if (!isBackground) {
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email },
        process.env.JWT_SECRET || 'super_secret_key',
        { expiresIn: '5m' }
      );
      
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000 // 5 minutes
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

module.exports = authMiddleware;
