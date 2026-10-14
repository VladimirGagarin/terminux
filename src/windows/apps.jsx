import TodoApp from './TodoApp'
import NotesApp from './NotesApp'
import TimerApp from './TimerApp'
import ConvertApp from './ConvertApp'
import WeatherApp from './WeatherApp'
import RandomApp from './RandomApp'
import DevToolsApp from './DevToolsApp'
import TextEditorApp from './TextEditorApp'
import DrawApp from './DrawApp'

export const APPS = {
  todo: { title: 'To-Do', icon: '✓', size: { w: 460, h: 580 }, component: TodoApp },
  notes: { title: 'Notes', icon: '✎', size: { w: 580, h: 540 }, component: NotesApp },
  timer: { title: 'Timer', icon: '◷', size: { w: 460, h: 580 }, component: TimerApp },
  convert: { title: 'Converter', icon: '⇄', size: { w: 480, h: 480 }, component: ConvertApp },
  weather: { title: 'Weather', icon: '☁', size: { w: 500, h: 600 }, component: WeatherApp },
  random: { title: 'Random', icon: '⚄', size: { w: 520, h: 620 }, component: RandomApp },
  devtools: { title: 'Dev Tools', icon: '{}', size: { w: 560, h: 580 }, component: DevToolsApp },
  textedit: { title: 'Text Editor', icon: '≡', size: { w: 620, h: 600 }, component: TextEditorApp },
  draw: { title: 'Draw', icon: '◨', size: { w: 700, h: 640 }, component: DrawApp },
}

export const APP_ORDER = ['todo', 'notes', 'timer', 'convert', 'weather', 'random', 'devtools', 'textedit', 'draw']
