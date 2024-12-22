const Badge = ({ name = "User", score = 0, totalQuestions = 0 }) => {
  const getBadgeInfo = () => {
    if (totalQuestions >= 25 && score >= 20) {
      return {
        type: "gold",
        gradient: "url(#goldGradient)",
        achievement: "Gold Achievement",
      };
    } else if (totalQuestions >= 15 && score >= 10) {
      return {
        type: "silver",
        gradient: "url(#silverGradient)",
        achievement: "Silver Achievement",
      };
    }
    return null;
  };

  const generateBadgeSvg = (badgeInfo) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" aria-label="Achievement Badge">
      <defs>
        <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#C0C0C0" />
          <stop offset="50%" style="stop-color:#E8E8E8" />
          <stop offset="100%" style="stop-color:#B0B0B0" />
        </linearGradient>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FFD700" />
          <stop offset="50%" style="stop-color:#FFED4A" />
          <stop offset="100%" style="stop-color:#DAA520" />
        </linearGradient>
      </defs>
      <circle cx="150" cy="200" r="120" fill="${badgeInfo.gradient}" stroke="#2c3e50" stroke-width="8" />
      <circle cx="150" cy="200" r="100" fill="none" stroke="#2c3e50" stroke-width="4" />
      <path d="M150 80 L130 40 L170 40 Z" fill="#FFD700" stroke="#2c3e50" stroke-width="4" />
      <text x="150" y="180" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="#2c3e50">${name}</text>
      <text x="150" y="220" text-anchor="middle" font-size="20" font-family="Arial, sans-serif" fill="#2c3e50">${badgeInfo.achievement}</text>
      <text x="150" y="250" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" fill="#2c3e50">Score: ${score}/${totalQuestions}</text>
    </svg>
  `;

  const downloadBadge = () => {
    const badgeInfo = getBadgeInfo();
    if (!badgeInfo) return;

    const svgContent = generateBadgeSvg(badgeInfo);
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${badgeInfo.type}-badge.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const badgeInfo = getBadgeInfo();
  if (!badgeInfo)
    return (
      <div className="text-center mt-8">
        <h3 className="text-lg font-bold text-gray-500">
          Keep going! Earn a badge by improving your score.
        </h3>
      </div>
    );

  return (
    <div className="mt-8 text-center">
      <h3 className="text-2xl font-bold mb-4">
        Congratulations! You've earned a {badgeInfo.type} badge!
      </h3>
      <div
        className="w-64 h-64 mx-auto mb-4"
        dangerouslySetInnerHTML={{
          __html: generateBadgeSvg(badgeInfo),
        }}
      />
      <button
        onClick={downloadBadge}
        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition duration-300"
      >
        Download Badge
      </button>
    </div>
  );
};

export default Badge;
