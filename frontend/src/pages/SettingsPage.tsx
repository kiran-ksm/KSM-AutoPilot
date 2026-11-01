import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import { Moon, Sun } from 'lucide-react';
import { env } from '@/config/env';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  const envInfo = [
    { label: 'Environment', value: env.appEnv },
    { label: 'Demo Mode', value: env.demoMode ? 'Enabled' : 'Disabled' },
    { label: 'AWS Region', value: env.awsRegion || '(not set)' },
    { label: 'API Base URL', value: env.apiBaseUrl || '(not set)' },
  ];

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Settings
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardHeader title="Appearance" titleTypographyProps={{ variant: 'subtitle1' }} />
        <CardContent sx={{ pt: 0 }}>
          <List dense>
            <ListItem
              secondaryAction={
                <Chip
                  label={mode === 'dark' ? 'Dark' : 'Light'}
                  size="small"
                  color={mode === 'dark' ? 'default' : 'primary'}
                  icon={mode === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                />
              }
            >
              <ListItemText primary="Theme" secondary="Switch between light and dark mode" />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="Toggle Theme" secondary="Click to switch modes" />
              <Chip
                label="Toggle"
                size="small"
                onClick={toggleMode}
                clickable
                color="primary"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardHeader title="Account" titleTypographyProps={{ variant: 'subtitle1' }} />
        <CardContent sx={{ pt: 0 }}>
          <List dense>
            <ListItem>
              <ListItemText primary="Signed in as" secondary={user?.signInDetails?.loginId ?? 'Unknown'} />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Environment" subheader="Read-only runtime configuration" titleTypographyProps={{ variant: 'subtitle1' }} />
        <CardContent sx={{ pt: 0 }}>
          <List dense>
            {envInfo.map((item, idx) => (
              <React.Fragment key={item.label}>
                <ListItem
                  secondaryAction={
                    <Chip
                      label={item.value}
                      size="small"
                      color={item.label === 'Demo Mode' && item.value === 'Enabled' ? 'warning' : 'default'}
                    />
                  }
                >
                  <ListItemText primary={item.label} />
                </ListItem>
                {idx < envInfo.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};
