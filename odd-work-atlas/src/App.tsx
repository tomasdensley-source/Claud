import { useEffect } from 'react';
import { NavProvider, useNav, type Tab } from './nav';
import { Today } from './screens/Today';
import { Pipeline } from './screens/Pipeline';
import { Queue } from './screens/Queue';
import { Browse } from './screens/Browse';
import { Money } from './screens/Money';
import { GigDetail } from './screens/GigDetail';
import { FloorsScreen, More, ProfileScreen } from './screens/More';
import { Icon, type IconName } from './ui/Icon';
import { tap } from './native';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'pipeline', label: 'Pipeline', icon: 'pipeline' },
  { id: 'queue', label: 'Queue', icon: 'queue' },
  { id: 'browse', label: 'Search', icon: 'search' },
  { id: 'money', label: 'Money', icon: 'money' },
];

const ROOTS: Record<Tab, () => React.ReactElement> = {
  today: Today,
  pipeline: Pipeline,
  queue: Queue,
  browse: Browse,
  money: Money,
};

function Shell() {
  const { tab, stack, setTab } = useNav();
  const top = stack[stack.length - 1];

  useEffect(() => {
    document.querySelector('.layer.active .screen')?.scrollTo?.({ top: 0 });
  }, [top]);

  return (
    <div className="app">
      <main className="layers">
        {/* Tab roots stay mounted so search text, filters and scroll survive tab switches. */}
        {TABS.map(({ id }) => {
          const Root = ROOTS[id];
          const active = id === tab && !top;
          return (
            <div key={id} className={`layer ${active ? 'active' : ''}`} hidden={!active}>
              <Root />
            </div>
          );
        })}
        {top && (
          <div className="layer active pushed" key={stack.length}>
            {top.kind === 'gig' && <GigDetail id={top.id} />}
            {top.kind === 'more' && <More />}
            {top.kind === 'profile' && <ProfileScreen />}
            {top.kind === 'floors' && <FloorsScreen />}
          </div>
        )}
      </main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => { tap(); setTab(t.id); }}
          >
            <span className="tab-icon"><Icon name={t.icon} /></span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  );
}
