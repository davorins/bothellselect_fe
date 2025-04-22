const PlayerRegistration = require('../models/PlayerRegistration');

// Check if a player is already registered for a season and year
exports.checkPlayerRegistration = async (req, res) => {
  const { playerId } = req.params;
  const { season, year } = req.query;

  try {
    const registration = await PlayerRegistration.findOne({
      playerId,
      season,
      year,
    });

    if (registration) {
      return res.status(200).json({ isRegistered: true });
    } else {
      return res.status(200).json({ isRegistered: false });
    }
  } catch (error) {
    console.error('Error checking player registration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Register a player for a season and year
exports.registerPlayer = async (req, res) => {
  const { playerId, season, year, grade, schoolName } = req.body;

  try {
    // Check if the player is already registered for the season and year
    const existingRegistration = await PlayerRegistration.findOne({
      playerId,
      season,
      year,
    });

    if (existingRegistration) {
      return res
        .status(400)
        .json({ error: 'Player already registered for this season' });
    }

    // Create a new registration record
    const newRegistration = new PlayerRegistration({
      playerId,
      season,
      year,
      grade,
      schoolName,
    });

    await newRegistration.save();

    return res.status(201).json({ message: 'Player registered successfully' });
  } catch (error) {
    console.error('Error registering player:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
