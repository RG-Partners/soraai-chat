import { Settings } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import SettingsDialogue, {
  type SettingsSectionKey,
} from './SettingsDialogue';
import { AnimatePresence } from 'framer-motion';

type SettingsButtonProps = {
  canManageSettings?: boolean;
  renderTrigger?: (options: { open: () => void }) => ReactNode;
  initialSection?: SettingsSectionKey;
};

const SettingsButton = ({
  canManageSettings,
  renderTrigger,
  initialSection,
}: SettingsButtonProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const open = () => setIsOpen(true);

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open })
      ) : (
        <button
          type="button"
          onClick={open}
          className="p-2.5 rounded-full bg-light-200 text-black/70 dark:bg-dark-200 dark:text-white/70 hover:opacity-70 hover:scale-105 transition duration-200 cursor-pointer active:scale-95"
          aria-label="Open settings"
        >
          <Settings size={19} className="cursor-pointer" />
        </button>
      )}
      <AnimatePresence>
        {isOpen && (
          <SettingsDialogue
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            canManageSettings={canManageSettings}
            initialSection={initialSection}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SettingsButton;
