import React, { Component, ReactNode } from 'react';
import { Box, Button, Alert, Collapse } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetail: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, showDetail: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetail: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          bgcolor: 'background.default',
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 600, width: '100%', mb: 2 }}>
          <strong>KSM AutoPilot failed to start.</strong>
          <br />
          {this.state.error?.message}
        </Alert>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button
            variant="outlined"
            onClick={() => this.setState((s) => ({ ...s, showDetail: !s.showDetail }))}
          >
            {this.state.showDetail ? 'Hide' : 'Show'} details
          </Button>
        </Box>

        <Collapse in={this.state.showDetail}>
          <Box
            component="pre"
            sx={{
              mt: 2,
              p: 2,
              bgcolor: '#1e1e1e',
              color: '#f8f8f2',
              borderRadius: 1,
              fontSize: 12,
              maxWidth: 700,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.error?.stack}
          </Box>
        </Collapse>
      </Box>
    );
  }
}
