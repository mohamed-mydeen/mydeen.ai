import { VIEW } from "../constants";

const NAV_ITEMS = [
  { view: VIEW.HOME,    icon: "home",    label: "Home"    },
  { view: VIEW.CHAT,    icon: "chat",    label: "Chat"    },
  { view: VIEW.HISTORY, icon: "history", label: "History" },
  { view: VIEW.SETTINGS,icon: "settings",label: "Settings"},
];

export default function BottomNav({ currentView, onNavigate, onNewChat }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = currentView === item.view;
        return (
          <button
            key={item.view}
            id={`bottom-nav-${item.view}`}
            className={`bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (item.view === VIEW.CHAT) {
                onNewChat();
              } else {
                onNavigate(item.view);
              }
            }}
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
