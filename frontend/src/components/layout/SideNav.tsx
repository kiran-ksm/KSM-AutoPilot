import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { LayoutDashboard, Users, Terminal, Settings, Plug, Car, CalendarCheck } from 'lucide-react';
import { env } from '@/config/env';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  demoOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    path: '/dashboard',    icon: <LayoutDashboard size={20} /> },
  { label: 'Leads',        path: '/leads',        icon: <Users size={20} /> },
  { label: 'Inventory',    path: '/inventory',    icon: <Car size={20} /> },
  { label: 'Appointments', path: '/appointments', icon: <CalendarCheck size={20} /> },
  { label: 'Demo Console', path: '/demo-console', icon: <Terminal size={20} />, demoOnly: true },
  { label: 'Integrations', path: '/integrations', icon: <Plug size={20} /> },
  { label: 'Settings',     path: '/settings',     icon: <Settings size={20} /> },
];

interface SideNavProps {
  onNavClick?: () => void;
}

export const SideNav: React.FC<SideNavProps> = ({ onNavClick }) => {
  const location = useLocation();
  const theme = useTheme();

  const visibleItems = NAV_ITEMS.filter((item) => !item.demoOnly || env.demoMode);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="overline" sx={{ color: theme.palette.primary.main, letterSpacing: '0.1em' }}>
          KSM AutoPilot
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {visibleItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={NavLink}
                to={item.path}
                onClick={onNavClick}
                selected={isActive}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  color: isActive
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                  transition: 'color 0.2s, background-color 0.2s',
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, letterSpacing: '0.06em' }}>
          ENV: {env.appEnv.toUpperCase()}
        </Typography>
      </Box>
    </Box>
  );
};
