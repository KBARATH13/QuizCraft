function calculateLevel(xp) {
    // Level 0
    if (xp < 10) {
        return {
            level: 0,
            xpForCurrentLevel: 0, // Total XP accumulated to start this level
            xpToNextLevel: 10,      // Total XP needed to reach next level
            xpProgress: xp,         // XP earned within the current level
            xpRemainingForNextLevel: 10 - xp
        };
    }

    let cumulativeXp = 10; // XP needed to reach level 1

    for (let i = 1; i < 50; i++) {
        const xpNeededForNextLevel = 10 * (i + 1);
        if (xp < cumulativeXp + xpNeededForNextLevel) {
            return {
                level: i,
                xpForCurrentLevel: cumulativeXp,
                xpToNextLevel: cumulativeXp + xpNeededForNextLevel,
                xpProgress: xp - cumulativeXp,
                xpRemainingForNextLevel: (cumulativeXp + xpNeededForNextLevel) - xp
            };
        }
        cumulativeXp += xpNeededForNextLevel;
    }

    // Handle max level (50)
    const xpForLevel50Start = cumulativeXp;
    return {
        level: 50,
        xpForCurrentLevel: xpForLevel50Start,
        xpToNextLevel: xpForLevel50Start, // No next level
        xpProgress: xp - xpForLevel50Start,
        xpRemainingForNextLevel: 0
    };
}

module.exports = { calculateLevel };