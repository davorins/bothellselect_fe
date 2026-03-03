// hooks/useRegistration.ts
import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RegistrationType, FormData } from '../../types/registration-types';

export const useRegistration = (registrationType: RegistrationType) => {
  const { parent, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRegistration = useCallback(
    async (formData: FormData) => {
      setIsSubmitting(true);
      setError(null);

      try {
        let endpoint = '';
        let payload: any = {};

        switch (registrationType) {
          case 'tryout':
            endpoint = '/register/basketball-camp';
            payload = {
              ...formData,
              players: formData.players?.map((player) => ({
                ...player,
                season: formData.eventData?.season,
                year: formData.eventData?.year,
                tryoutId: formData.eventData?.eventId,
              })),
            };
            break;

          case 'tournament':
            endpoint = '/register/tournament-team';
            payload = {
              ...formData,
              tournament: formData.eventData?.season,
              year: formData.eventData?.year,
            };
            break;

          case 'team':
            endpoint = '/players/register';
            payload = {
              ...formData,
              season: formData.eventData?.season,
              year: formData.eventData?.year,
              tryoutId: formData.eventData?.eventId,
            };
            break;

          default:
            throw new Error(
              `Unsupported registration type: ${registrationType}`
            );
        }

        // Add authentication if user is logged in
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (isAuthenticated) {
          const token = localStorage.getItem('token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}${endpoint}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `Registration failed: ${response.status}`
          );
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [registrationType, isAuthenticated]
  );

  const validateFormData = useCallback(
    (formData: FormData): string[] => {
      const errors: string[] = [];

      // Common validations
      if (!formData.user?.email) {
        errors.push('Email is required');
      }

      if (!formData.user?.fullName) {
        errors.push('Full name is required');
      }

      // Type-specific validations
      switch (registrationType) {
        case 'tryout':
        case 'team':
          if (!formData.players || formData.players.length === 0) {
            errors.push('At least one player is required');
          }
          break;

        case 'tournament':
          if (!formData.team?.name) {
            errors.push('Team name is required');
          }
          if (!formData.team?.grade) {
            errors.push('Team grade is required');
          }
          break;
      }

      return errors;
    },
    [registrationType]
  );

  return {
    submitRegistration,
    validateFormData,
    isSubmitting,
    error,
    setError,
    isAuthenticated,
    parent,
  };
};

export const usePaymentProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const processPayment = useCallback(async (paymentData: any) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let endpoint = '';
      if (paymentData.teamId) {
        endpoint = '/payments/tournament-team';
      } else if (paymentData.players) {
        endpoint = '/payments/tryout';
      } else {
        endpoint = '/payments/process';
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}${endpoint}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(paymentData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment processing failed');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Payment processing failed';
      setPaymentError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    processPayment,
    isProcessing,
    paymentError,
    setPaymentError,
  };
};
