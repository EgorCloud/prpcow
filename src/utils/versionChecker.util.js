module.exports = function versionChecker(required, current, strategy) {
  const splitRequired = required.split(".");
  const splitCurrent = current.split(".");
  switch (strategy) {
    case "identical":
      return required === current;
    case "major":
      return splitRequired[0] === splitCurrent[0];
    case "minor":
      return (
        splitRequired[0] === splitCurrent[0] &&
        splitRequired[1] === splitCurrent[1]
      );
    case "patch":
      return (
        splitRequired[0] === splitCurrent[0] &&
        splitRequired[1] === splitCurrent[1] &&
        splitRequired[2] === splitCurrent[2]
      );
    default:
      return false;
  }
};
