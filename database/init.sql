CREATE DATABASE IF NOT EXISTS tododb;
USE tododb;

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
  status ENUM('TODO', 'IN_PROGRESS', 'DONE', 'LATE') DEFAULT 'TODO',
  category VARCHAR(100) DEFAULT 'Général',
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);

-- Données de démo
INSERT INTO tasks (title, description, priority, status, category, deadline) VALUES
('Réviser le rapport Q2', 'Relire et corriger le rapport trimestriel avant soumission', 'HIGH', 'TODO', 'Travail', DATE_ADD(CURDATE(), INTERVAL 3 DAY)),
('Réunion d''équipe', 'Préparer les points à aborder lors de la réunion hebdomadaire', 'MEDIUM', 'IN_PROGRESS', 'Réunions', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('Mettre à jour les dépendances', 'Vérifier et mettre à jour les packages npm du projet', 'LOW', 'TODO', 'Dev', DATE_ADD(CURDATE(), INTERVAL 7 DAY)),
('Finir le mémoire', 'Rédiger la conclusion et la bibliographie', 'HIGH', 'LATE', 'Études', DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
('Commander fournitures', 'Commander papier, stylos et cartouches d''encre', 'LOW', 'DONE', 'Administratif', DATE_SUB(CURDATE(), INTERVAL 5 DAY));
