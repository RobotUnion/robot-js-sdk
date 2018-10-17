'use strict';

const fs = require('fs-extra');
const path = require('path');
const { Task, Robot } = require('../integration');
const checker = require('./checker');
const examples = require('./examples');


class Runner {

  constructor() {
    this._taskMap = {};
  }

  /**
   * Create a task for execution
   * @param {string} task_path 
   * @param {any} manifest
   * @param {any} input 
   * @param {string} robot_id 
   * @returns {Task}
   */
  createTask(task_path, manifest, input, mock) {
    if (!checker.isValidTaskProject(task_path, manifest)) {
      throw new Error(`ERROR: Task "${task_path}" seams to not be a rallf task.`);
    }

    let mainFile = manifest.main;
    let taskPath = path.join(path.resolve(task_path), mainFile);
    let UserTask = /** @type {Task} */ (require(taskPath));

    checker.checkExportToBeTask(UserTask, manifest);

    let taskInstance = /** @type {UserTask} */ new UserTask();
    taskInstance._manifest = manifest;
    taskInstance.id = manifest.name;
    taskInstance.robot = this.getRobot(task_path + '/' + mock.robot.cwd || null);
    taskInstance.input = input;

    taskInstance.devices._setDevices(mock.devices || []);

    let pipePath = task_path + '/.rallf'
    if (!fs.existsSync(pipePath)) {
      fs.mkdirpSync(pipePath);
      fs.writeFileSync(pipePath + '/event-pipe', '');
    }

    fs.watchFile(pipePath + '/event-pipe', (prev, curr) => {
      if (curr !== prev) {
        let data = fs.readFileSync(pipePath + '/event-pipe').toString().trim();
        if (/^([\w\d]*):([\w\d]*) (.*)$/.test(data)) {
          let parsed = this.parseEvent(data);
          taskInstance.emit(parsed.event_name + ':' + parsed.event_type, parsed.data);
        }
      }
    });
    this._taskMap[taskInstance.getName()] = { instance: taskInstance, mock, manifest };
    return taskInstance;
  }

  safeJSONParse(str) {
    let parsed;
    try {
      parsed = JSON.parse(str);
    } catch (e) {
      parsed = JSON.parse(JSON.stringify(str));
    }
    return parsed;
  }

  /**
   * String format: <event_type>:<event_name> <{data}>
   * @param {string} str 
   * @return {{event_name:string, event_type:string, data: any}}
   */
  parseEvent(str) {
    let parts = str.match(/^([\w\d]*):([\w\d]*) (.*)$/);
    return {
      event_name: parts[1],
      event_type: parts[2],
      data: this.safeJSONParse(parts[3])
    };
  }


  /**
   * @param {string} cwd - robot cwd 
   * @return {Robot}
   */
  getRobot(cwd) {
    return new Robot(cwd);
  }

  /**
   * Get a mock from task
   * @param {string} task_path 
   * @param {string} name 
   */
  getMock(task_path, name) {
    let mockPath = path.join(path.resolve(task_path), 'mocks', name + '.mock.js');
    if (fs.existsSync(mockPath)) {
      const mock = require(mockPath);
      mock.name = name;
      return mock;
    }
    return null;
  }

  /**
   * Return the manifest of given task
   * @param {string} task_path - path to the task 
   */
  getManifest(task_path) {
    let validTask = checker.isValidTaskProject(task_path);
    if (validTask.error) {
      throw new Error(`ERROR: ` + validTask.error);
    }

    let manifestPath = path.join(task_path, 'config', 'manifest.json');
    const manifest = fs.readJSONSync(manifestPath);

    let validManifest = checker.validManifest(manifest);
    if (validManifest.errors) {
      validManifest.errors.forEach(element => {
        throw new Error(`ERROR: Task ${task_path} manifest is invalid: \n ${element.stack}`);
      });
    }

    return manifest;
  }


  checkAccessToSkill(manifest, skill_name, skill_method) {
    if (
      manifest.skills
      && manifest.skills[skill_name]
      && manifest.skills[skill_name].indexOf(skill_method) !== -1
    ) return true;
    return false;
  }

  /**
   * Delegate in a skill
   * @param {Task} task
   * @param {*} skill_name 
   * @param {*} skill_method 
   * @param {*} data 
   * @param {*} options 
   */
  async delegateTask(task, skill_name, skill_method, data, options) {
    let task_ = this._taskMap[task.getName()];
    let manifest = task_.manifest;
    let mock = task_.mock;

    let hasAccessToSkill = this.checkAccessToSkill(manifest, skill_name, skill_method);

    if (!hasAccessToSkill) {
      return Promise.reject({ error: "You havent required access to that skill. Please add to manifest:" + examples.skills });
    }

    if (!mock.skills) {
      return Promise.reject({ error: `Oopsy, mock "${mock.name}" does not export any skills but you are requesting skill (${skill_name})` + examples.skills });
    }

    if (!(skill_name in mock.skills)) {
      return Promise.reject({ error: `Oopsy, skill "${skill_name}" is not exported in mock: ${mock.name}` + examples.skills });
    }

    let skill = mock.skills[skill_name];
    if (!(skill_method in skill.methods)) {
      return Promise.reject({ error: `Oopsy, skill method "${skill_method}" is not exported by mock: ${mock.name}` + examples.skills });
    }

    let method = skill.methods[skill_method];

    return Promise.resolve(method.callback(data, task_));
  }

  /**
   * 
   * @param {Task} task 
   */
  async runTask(task) {
    if (!task || task.__proto__.constructor.__proto__.name !== 'Task') {
      throw { error: "Exported function must extend from \"Task\"" };
    }

    // First setup task
    task.emit('setup:start', {});
    task.delegateLocal = (...args) => {
      return new Promise((resolve, reject) => {
        this.delegateTask(task, ...args)
          .then(resp => {
            resolve(resp);
          })
          .catch(error => reject(error));
      });
    };
    task.logger.task_name = task.getName();


    // Run hooks
    task.emit('setup:end', {});

    // Start
    task.emit('start', {});
    let result = await task.start();

    task.emit('finish', {});

    if (task.type !== 'skill') {
      await task.devices.quitAll();
    }

    return result;
  }
}

module.exports = Runner;