export class TimeUpdater {

  constructor(component, stateVariable) {
    this.started = false;
    this.seconds = 0;
    this.lastUpdatedTime = null;
    this.pausedTime = null;

    this.component = component;
    this.stateVariable = stateVariable;

    this.timeout = null;
    this.interval = null;
  }

  // ------------------------------------------------------------

  update(seconds) {
    this.lastUpdatedTime = Date.now();
    this.component.setState({
      [this.stateVariable]: new Date(seconds * 1000).toISOString().substr(11, 8)
    });
  }

  continue(delay) {
    const instance = this;

    this.timeout = setTimeout(() => {
      instance.update(++this.seconds);
      this.interval = setInterval(() => {
        instance.update(++this.seconds);
      }, 1000);
    }, delay);
  }

  // ------------------------------------------------------------

  start(timeCode = undefined) {

    if (this.started) {
      return;
    }

    const timeCodeLocal = timeCode === undefined ? '00:00:00.000' : timeCode;

    const [hms, ms] = timeCodeLocal.split('.');
    const [hours, minutes, seconds] = hms.split(':');

    this.seconds = parseInt(seconds) + 60 * parseInt(minutes) + 60 * 60 * parseInt(hours);
    this.started = true;
    this.interval = null;

    this.update(this.seconds);
    this.continue(1000 - parseInt(ms));
  }

  stop() {
    this.started = false;

    clearTimeout(this.timeout);
    clearInterval(this.interval);
  }

  pause() {
    if ( ! this.started) {
      return;
    }

    clearTimeout(this.timeout);
    clearInterval(this.interval);

    this.pausedTime = Date.now();
  }

  resume() {
    if ( ! this.started) {
      return;
    }

    this.continue(1000 - (this.pausedTime - this.lastUpdatedTime));
  }
}
