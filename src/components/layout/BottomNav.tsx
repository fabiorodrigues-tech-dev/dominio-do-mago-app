import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  isAction?: boolean;
}

const mainNavItems: NavItem[] = [
  { icon: '🏠', label: 'Santuário', route: '/santuario' },
  { icon: '📜', label: 'Rituais', route: '/rituais' },
  { icon: '✨', label: 'Invocar', route: '/invocar', isAction: true },
  { icon: '🔄', label: 'Ciclos', route: '/ciclos' },
  { icon: '📖', label: 'Grimório', route: '/grimorio' },
];

const allRoutes = [
  { icon: '🏠', label: 'Santuário', route: '/santuario' },
  { icon: '📜', label: 'Rituais', route: '/rituais' },
  { icon: '🔄', label: 'Ciclos', route: '/ciclos' },
  { icon: '🗺️', label: 'Jornadas', route: '/jornadas' },
  { icon: '🏗️', label: 'Grandes Obras', route: '/grandes-obras' },
  { icon: '🔨', label: 'Forja', route: '/forja' },
  { icon: '🗓️', label: 'Temporal', route: '/temporal/semana' },
  { icon: '🔮', label: 'Astrolábio', route: '/astrolabio' },
  { icon: '📖', label: 'Grimório', route: '/grimorio' },
  { icon: '⚡', label: 'Pilares', route: '/pilares' },
  { icon: '🌿', label: 'Domínios', route: '/dominios' },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      {/* Menu Overlay */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-20 left-4 right-4 bg-mystic-purple/95 backdrop-blur-xl 
                        rounded-3xl border border-white/10 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mystic text-lg text-mystic-gold">Navegação</h3>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="p-2 rounded-full hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {allRoutes.map((item) => {
                  const isActive = location.pathname === item.route;
                  return (
                    <motion.button
                      key={item.route}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        navigate(item.route);
                        setShowMenu(false);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-mystic-gold/20 border border-mystic-gold/50' 
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className={`text-sm ${isActive ? 'text-mystic-gold' : 'text-white/70'}`}>
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-glass bg-void/95 border-t border-white/10"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {/* Menu Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMenu(true)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
              showMenu ? 'text-mystic-gold' : 'text-white/50 hover:text-white/70'
            }`}
          >
            <Menu className="w-6 h-6 mb-0.5" />
            <span className="text-[10px]">Menu</span>
          </motion.button>

          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.route;
            
            if (item.isAction) {
              return (
                <motion.button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative -top-4"
                >
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(157, 78, 221, 0.4)',
                        '0 0 40px rgba(157, 78, 221, 0.6)',
                        '0 0 20px rgba(157, 78, 221, 0.4)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-mystic-arcane to-purple-600 
                             flex items-center justify-center border-2 border-white/20"
                  >
                    <span className="text-2xl">{item.icon}</span>
                  </motion.div>
                  <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 
                                 text-[10px] text-white/60 whitespace-nowrap">
                    {item.label}
                  </span>
                </motion.button>
              );
            }

            return (
              <motion.button
                key={item.route}
                onClick={() => navigate(item.route)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1
                           transition-colors relative ${
                  isActive ? 'text-mystic-gold' : 'text-white/50 hover:text-white/70'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-x-4 top-0 h-0.5 bg-gradient-to-r from-transparent via-mystic-gold to-transparent"
                  />
                )}
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className="text-[10px]">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
        
        {/* Safe area padding for mobile */}
        <div className="h-safe-area-inset-bottom" />
      </motion.nav>
    </>
  );
};
