export class MartingaleManager {
  constructor(settings) {
    this.settings = settings;
    this.currentStep = 0;
  }

  updateSettings(next) {
    this.settings = { ...this.settings, ...next };
  }

  nextStake(baseStake) {
    if (!this.settings.enabled) return baseStake;
    return Number((baseStake * this.settings.multiplier ** this.currentStep).toFixed(2));
  }

  onTradeResult(profit) {
    if (!this.settings.enabled) return;
    if (profit < 0) this.currentStep = Math.min(this.currentStep + 1, this.settings.maxSteps);
    else this.currentStep = 0;
  }

  resetTradingState() {
    this.currentStep = 0;
  }
}
