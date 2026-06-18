import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
  PaymentFormProps as SquarePaymentFormProps,
} from 'react-square-web-payments-sdk';
import axios from 'axios';
import {
  Player,
  PaymentModuleProps,
  RegistrationFormConfig,
  PricingPackage,
  SeasonRegistration,
  TournamentSpecificConfig,
} from '../../../types/registration-types';
import {
  PaymentSystem,
  PaymentConfiguration as PaymentConfigType,
  SquareConfig,
  CloverConfig,
} from '../../../types/paymentTypes';
import CloverPaymentForm from '../CloverPaymentForm';

interface EnhancedPaymentModuleProps extends PaymentModuleProps {
  formConfig?: RegistrationFormConfig;
  playerCount?: number;
  selectedPackage?: PricingPackage | null;
  disabled?: boolean;
  players?: any[];
  eventData?: any;
  onPaymentComplete?: (successData: {
    success: boolean;
    paymentId: string;
    paymentSystem: string;
    externalPaymentId: string;
    receiptUrl: string;
    players: any[];
    team?: any;
    teams?: any[];
    amount: number;
    email: string;
    playerCount: number;
    totalAmount: number;
    duplicate?: boolean;
  }) => void;
  savedUserData?: any;
  savedPlayers?: any[];
  pendingRegistrationId?: string | null;
  team?: any;
  teams?: any[];
  tournamentConfig?: any;
  registrationType?: 'tournament' | 'tryout' | 'training' | 'player';
  parentId?: string | null;
  user?: any;
  formData?: any;
}

interface PaymentFormMethods {
  tokenize: () => Promise<{
    token: string;
    details?: {
      card: {
        last_4: string;
        card_brand: string;
        exp_month: string;
        exp_year: string;
      };
    };
  }>;
}

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const PaymentForm = forwardRef<PaymentFormMethods, SquarePaymentFormProps>(
  (props, ref) => {
    const paymentFormRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      tokenize: async () => {
        if (!paymentFormRef.current) {
          throw new Error('Payment form not initialized');
        }
        return new Promise((resolve, reject) => {
          paymentFormRef.current?.tokenize({
            onValidationErrors: (errors: any) => {
              reject(new Error('Card validation failed'));
            },
            onCardTokenized: (err: any, result: any) => {
              if (err) {
                reject(new Error(err.message || 'Tokenization failed'));
                return;
              }
              if (result.status === 'OK') {
                resolve({
                  token: result.token,
                  details: result.details
                    ? {
                        card: {
                          last_4: result.details.card?.last4 || '',
                          card_brand: result.details.card?.brand || '',
                          exp_month: result.details.card?.expMonth || '',
                          exp_year: result.details.card?.expYear || '',
                        },
                      }
                    : undefined,
                });
              } else {
                reject(
                  new Error(
                    result.errors?.[0]?.message || 'Tokenization failed',
                  ),
                );
              }
            },
          });
        });
      },
    }));

    return (
      <SquarePaymentForm {...props} ref={paymentFormRef}>
        {props.children}
      </SquarePaymentForm>
    );
  },
);

PaymentForm.displayName = 'PaymentForm';

const PaymentModule: React.FC<EnhancedPaymentModuleProps> = ({
  amount,
  customerEmail,
  onPaymentSuccess,
  onPaymentError,
  description = 'Registration Fee',
  isProcessing = false,
  onComplete,
  onBack,
  formData,
  eventData,
  formConfig,
  playerCount = 1,
  selectedPackage = null,
  disabled = false,
  players = [],
  team = null,
  teams = [],
  onPaymentComplete,
  tournamentConfig,
  registrationType = 'player',
  parentId = null,
  user = null,
  savedUserData = null,
  savedPlayers = [],
  pendingRegistrationId = null,
}) => {
  const paymentFormRef = useRef<PaymentFormMethods>(null);
  const [calculatedAmount, setCalculatedAmount] = useState(amount);
  const [isPaying, setIsPaying] = useState(false);
  const [localCustomerEmail, setLocalCustomerEmail] = useState(
    customerEmail || '',
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [duplicateDetected, setDuplicateDetected] = useState(false);

  // Payment configuration state
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigType | null>(
    null,
  );
  const [paymentSystem, setPaymentSystem] = useState<PaymentSystem>('square');
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Refs to track previous values and prevent infinite loops
  const prevPlayersRef = useRef<any[]>();
  const prevFormDataPlayersRef = useRef<any[]>();
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>('');
  const paymentAttemptedRef = useRef(false);

  // Fetch payment configuration on mount
  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        setLoadingConfig(true);
        const response = await axios.get<{
          success: boolean;
          paymentSystem: PaymentSystem;
          environment: string;
          currency: string;
          squareConfig?: {
            applicationId?: string;
            locationId?: string;
            environment?: string;
          };
          cloverConfig?: {
            merchantId?: string;
            environment?: string;
            accessToken?: string;
          };
        }>(`${API_BASE_URL}/payment-configuration/frontend/config`);

        if (response.data.success) {
          const activeSystem = response.data.paymentSystem as PaymentSystem;
          setPaymentSystem(activeSystem);

          const paymentConfigData: PaymentConfigType = {
            _id: 'temp',
            paymentSystem: activeSystem,
            isActive: true,
            squareConfig: response.data.squareConfig,
            cloverConfig: response.data.cloverConfig,
            settings: {
              currency: response.data.currency as any,
              taxRate: 0,
              enableAutomaticRefunds: false,
              enablePartialRefunds: false,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          setPaymentConfig(paymentConfigData);

          console.log('Loaded payment configuration:', {
            system: activeSystem,
            environment: response.data.environment,
            currency: response.data.currency,
          });

          if (activeSystem === 'square') {
            if (
              !response.data.squareConfig?.applicationId ||
              !response.data.squareConfig?.locationId
            ) {
              console.error('Square configuration incomplete');
              setPaymentError(
                'Square payment configuration is incomplete. Please contact administrator.',
              );
            }
          } else if (activeSystem === 'clover') {
            if (!response.data.cloverConfig?.merchantId) {
              console.error('Clover configuration incomplete');
              setPaymentError(
                'Clover payment configuration is incomplete. Please contact administrator.',
              );
            }
          }
        } else {
          setPaymentError('No active payment system configured');
        }
      } catch (error) {
        console.error('Error fetching payment configuration:', error);
        setPaymentError(
          'Unable to load payment system. Please try again later.',
        );
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchPaymentConfig();
  }, []);

  // Use direct props or formData props
  const effectivePlayers = React.useMemo(() => {
    console.log('🔄 PaymentModule: Processing players for:', {
      registrationType,
      playersPropCount: players?.length || 0,
      formDataPlayersCount: formData?.players?.length || 0,
      eventData,
    });

    if (registrationType === 'tournament') {
      return [];
    }

    if (players && players.length > 0) {
      console.log(
        '✅ Using direct players prop:',
        players.map((p: Player) => ({ id: p._id, name: p.fullName })),
      );
      return players;
    }

    if (formData?.players && formData.players.length > 0) {
      console.log(
        '✅ Using formData players:',
        formData.players.map((p: Player) => ({ id: p._id, name: p.fullName })),
      );
      return formData.players;
    }

    console.log('⚠️ No players found for registration');
    return [];
  }, [players, formData, registrationType, eventData]);

  // Handle teams for tournament registration
  const effectiveTeam = team || formData?.team || null;
  const effectiveTeams = teams.length > 0 ? teams : team ? [team] : [];

  const effectiveEventData = useMemo(() => {
    const base = eventData || formData?.eventData || {};
    return {
      season: base.season || 'Basketball',
      year: base.year || new Date().getFullYear(),
      eventId:
        base.eventId || base._id || base.tryoutId || base.id || 'default-event',
    };
  }, [eventData, formData]);

  // Calculate effective player/team count
  const getEffectiveRegistrationCount = useCallback((): number => {
    console.log('🔍 getEffectiveRegistrationCount called:', {
      registrationType,
      effectivePlayersCount: effectivePlayers.length,
      effectiveTeamsCount: effectiveTeams.length,
    });

    if (registrationType === 'tournament') {
      return effectiveTeams.length;
    }

    if (registrationType === 'training') {
      return effectivePlayers.length;
    }

    if (registrationType === 'tryout') {
      const tryoutEventId = eventData?.eventId;
      const tryoutYear = eventData?.year;

      if (!tryoutEventId) {
        const unpaidTryoutPlayers = effectivePlayers.filter(
          (player: Player) =>
            !player.paymentComplete || player.paymentStatus !== 'paid',
        );
        return unpaidTryoutPlayers.length;
      }

      const unpaidTryoutPlayers = effectivePlayers.filter((player: Player) => {
        if (!player.seasons || player.seasons.length === 0) {
          return !player.paymentComplete || player.paymentStatus !== 'paid';
        }

        const hasPaidForThisTryout = player.seasons?.some(
          (s: SeasonRegistration) =>
            s.tryoutId === tryoutEventId &&
            s.year === tryoutYear &&
            s.paymentStatus === 'paid',
        );

        return !hasPaidForThisTryout;
      });

      return unpaidTryoutPlayers.length;
    }

    const unpaidPlayers = effectivePlayers.filter(
      (player: Player) =>
        !player.paymentComplete || player.paymentStatus !== 'paid',
    );

    return unpaidPlayers.length;
  }, [
    registrationType,
    effectiveTeams,
    effectivePlayers,
    eventData,
    effectiveEventData,
  ]);

  // Calculate amount
  useEffect(() => {
    let newAmount = amount;

    if (formConfig) {
      const effectiveCount = getEffectiveRegistrationCount();

      if (registrationType === 'tournament') {
        const tournamentFee =
          tournamentConfig?.tournamentFee ||
          formConfig.pricing.basePrice ||
          425;
        newAmount = tournamentFee * 100 * effectiveCount;
      } else {
        if (selectedPackage) {
          newAmount = selectedPackage.price * 100 * effectiveCount;
        } else {
          newAmount = formConfig.pricing.basePrice * 100 * effectiveCount;
        }
      }
    }

    if (newAmount !== calculatedAmount) {
      setCalculatedAmount(newAmount);
    }
  }, [
    formConfig,
    selectedPackage,
    playerCount,
    amount,
    effectivePlayers.length,
    effectiveTeam,
    effectiveTeams,
    getEffectiveRegistrationCount,
    calculatedAmount,
    registrationType,
    tournamentConfig,
  ]);

  // Reset duplicate detection when amount or players change
  useEffect(() => {
    setDuplicateDetected(false);
    paymentAttemptedRef.current = false;
  }, [calculatedAmount, effectivePlayers, effectiveTeams]);

  // Unified payment processing function
  const processPayment = async (token: string, cardDetails: any) => {
    // Prevent multiple submissions
    if (isSubmittingRef.current) {
      console.warn('Payment already in progress — ignoring duplicate call');
      return;
    }

    // Prevent re-submission after duplicate was detected
    if (duplicateDetected) {
      console.warn('Payment already completed — ignoring duplicate call');
      return;
    }

    isSubmittingRef.current = true;

    // Generate a unique idempotency key
    idempotencyKeyRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      setIsPaying(true);
      setPaymentError(null);

      const tokenAuth = localStorage.getItem('token');
      if (!tokenAuth) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const activeSystem = paymentSystem;

      if (!activeSystem) {
        throw new Error('No active payment system configured');
      }

      const last4 = cardDetails?.last_4 || cardDetails?.last4 || '';
      const brand = cardDetails?.card_brand || cardDetails?.brand || '';
      const expMonth = String(
        cardDetails?.exp_month || cardDetails?.expMonth || '',
      );
      const expYear = String(
        cardDetails?.exp_year || cardDetails?.expYear || '',
      );

      let endpoint = 'process';
      let backendEndpoint = 'process';

      if (registrationType === 'tournament') {
        backendEndpoint = 'tournament-teams';
      } else if (registrationType === 'tryout') {
        backendEndpoint = 'tryout';
      } else if (registrationType === 'training') {
        backendEndpoint = 'training';
      } else {
        backendEndpoint = 'process';
      }

      endpoint = backendEndpoint;

      const paymentData: any = {
        token,
        sourceId: token,
        amount: calculatedAmount,
        email: localCustomerEmail,
        registrationType,
        players: effectivePlayers.map((p: Player) => ({
          playerId: p._id,
          season: effectiveEventData?.season || 'Tryout',
          year: effectiveEventData?.year || new Date().getFullYear(),
          tryoutId: effectiveEventData?.eventId,
        })),
        cardDetails: {
          last_4: last4,
          card_brand: brand,
          exp_month: parseInt(expMonth),
          exp_year: parseInt(expYear),
        },
        cardExpYear: parseInt(expYear),
        cardExpMonth: parseInt(expMonth),
        cardLastFour: last4,
        cardBrand: brand,
        paymentSystem: activeSystem,
        idempotencyKey: idempotencyKeyRef.current,
      };

      // Add parentId
      paymentData.parentId =
        parentId || savedUserData?._id || formData?.user?._id;

      // Handle tournament registration
      if (registrationType === 'tournament') {
        const validTeamIds = effectiveTeams
          .filter((team: any) => team._id && /^[0-9a-fA-F]{24}$/.test(team._id))
          .map((team: any) => team._id);

        if (validTeamIds.length === 0) {
          throw new Error('No valid team IDs found for payment');
        }

        const tournamentName =
          effectiveTeams[0]?.tournament ||
          tournamentConfig?.tournamentName ||
          'Tournament Registration';
        const tournamentYear =
          effectiveTeams[0]?.registrationYear ||
          tournamentConfig?.tournamentYear ||
          new Date().getFullYear();

        paymentData.teamIds = validTeamIds;
        paymentData.tournament = tournamentName;
        paymentData.year = Number(tournamentYear);
      } else {
        // Handle player registration
        const playersToPay = effectivePlayers.filter((player: Player) => {
          return true;
        });

        if (playersToPay.length === 0) {
          throw new Error(
            `No players found that require payment for ${registrationType} registration`,
          );
        }

        if (registrationType === 'tryout') {
          paymentData.players = playersToPay
            .filter(
              (player: Player) =>
                player._id &&
                typeof player._id === 'string' &&
                player._id.length >= 12,
            )
            .map((player: Player) => {
              const tryoutId = effectiveEventData?.eventId;

              if (!tryoutId || tryoutId.trim() === '') {
                throw new Error('Tryout event ID is required');
              }

              if (!player._id || player._id.trim() === '') {
                throw new Error(
                  `Invalid player ID for player: ${player.fullName || 'Unknown'}`,
                );
              }

              return {
                playerId: player._id.trim(),
                season: (effectiveEventData?.season || 'Tryout').trim(),
                year: Number(
                  effectiveEventData?.year || new Date().getFullYear(),
                ),
                tryoutId: tryoutId.trim(),
              };
            });

          if (paymentData.players.length === 0) {
            throw new Error('No valid players found for tryout registration');
          }
        } else {
          paymentData.players = playersToPay
            .filter((player: Player) => player._id)
            .map((player: Player) => ({
              playerId: player._id,
              season:
                effectiveEventData?.season ||
                (registrationType === 'training' ? 'Training' : 'Basketball'),
              year: effectiveEventData?.year || new Date().getFullYear(),
              ...(registrationType === 'training' && {
                tryoutId: effectiveEventData?.eventId || 'training',
              }),
            }));
        }
      }

      console.log(`Processing ${activeSystem} payment:`, {
        endpoint,
        registrationType,
        amount: paymentData.amount,
        paymentSystem: activeSystem,
        idempotencyKey: idempotencyKeyRef.current,
      });

      const response = await axios.post(
        `${API_BASE_URL}/payments/${endpoint}`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${tokenAuth}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      if (response.data.success) {
        // Check if this was a duplicate payment that was already processed
        if (response.data.duplicate) {
          console.log(
            '⚠️ Duplicate payment detected, using existing payment:',
            response.data,
          );
          setDuplicateDetected(true);

          const successData = {
            success: true,
            paymentId: response.data.paymentId,
            paymentSystem: response.data.paymentSystem || activeSystem,
            externalPaymentId:
              response.data.externalPaymentId || response.data.paymentId,
            receiptUrl: response.data.receiptUrl || '',
            players: response.data.players || [],
            teams: response.data.teams || [],
            amount: paymentData.amount,
            email: localCustomerEmail,
            playerCount: paymentData.players?.length || 0,
            teamCount: paymentData.teamIds?.length || 0,
            totalAmount: paymentData.amount / 100,
            duplicate: true,
          };

          // Call all callbacks with duplicate flag
          if (onPaymentSuccess) {
            onPaymentSuccess({
              ...response.data,
              token: paymentData.token,
              calculatedAmount: paymentData.amount,
              paymentSystem: activeSystem,
              duplicate: true,
            });
          }

          if (onPaymentComplete) {
            onPaymentComplete(successData);
          }

          if (onComplete) {
            onComplete(successData);
          }

          console.log('⚠️ Using existing payment:', successData);
          return;
        }

        // Normal successful payment
        const successData = {
          success: true,
          paymentId: response.data.paymentId,
          paymentSystem: response.data.paymentSystem || activeSystem,
          externalPaymentId: response.data.externalPaymentId,
          receiptUrl: response.data.receiptUrl,
          players: response.data.players || [],
          teams: response.data.teams || [],
          amount: paymentData.amount,
          email: localCustomerEmail,
          playerCount: paymentData.players?.length || 0,
          teamCount: paymentData.teamIds?.length || 0,
          totalAmount: paymentData.amount / 100,
          duplicate: false,
        };

        if (onPaymentSuccess) {
          onPaymentSuccess({
            ...response.data,
            token: paymentData.token,
            calculatedAmount: paymentData.amount,
            paymentSystem: activeSystem,
          });
        }

        if (onPaymentComplete) {
          onPaymentComplete(successData);
        }

        if (onComplete) {
          onComplete(successData);
        }

        console.log(
          `🎉 ${activeSystem} payment completed successfully!`,
          successData,
        );
      } else {
        throw new Error(response.data.message || 'Payment processing failed');
      }
    } catch (error: any) {
      console.error('❌ Payment processing error:', error);

      let errorMessage = 'Payment processing failed';

      if (error.response) {
        // Handle duplicate response (409)
        if (error.response.status === 409) {
          // Check if the server returned success: true for duplicate
          if (error.response.data?.success) {
            console.log(
              '⚠️ Duplicate payment detected via 409 with success:',
              error.response.data,
            );
            setDuplicateDetected(true);

            const successData = {
              success: true,
              paymentId: error.response.data.paymentId,
              paymentSystem: error.response.data.paymentSystem || paymentSystem,
              externalPaymentId:
                error.response.data.externalPaymentId ||
                error.response.data.paymentId,
              receiptUrl: error.response.data.receiptUrl || '',
              players: [],
              teams: [],
              amount: calculatedAmount,
              email: localCustomerEmail,
              playerCount: 0,
              teamCount: 0,
              totalAmount: calculatedAmount / 100,
              duplicate: true,
            };

            if (onPaymentComplete) {
              onPaymentComplete(successData);
            }

            if (onComplete) {
              onComplete(successData);
            }
            return;
          }

          errorMessage =
            error.response.data?.message ||
            'Duplicate payment request detected. Please wait a moment and try again.';
        } else {
          errorMessage =
            error.response.data?.message ||
            error.response.data?.error ||
            `Server error: ${error.response.status}`;
        }

        if (error.response.data?.squareErrors) {
          const squareError = error.response.data.squareErrors[0];
          if (squareError) {
            errorMessage = `Payment declined: ${squareError.detail || squareError.code}`;
          }
        }
      } else if (error.request) {
        errorMessage =
          'No response from payment server. Please check your connection and try again.';
      } else {
        errorMessage = error.message || 'Payment processing failed';
      }

      setPaymentError(errorMessage);
      if (onPaymentError) {
        onPaymentError(errorMessage);
      }
      throw error;
    } finally {
      isSubmittingRef.current = false;
      setIsPaying(false);
    }
  };

  // Handle Square tokenization
  const handleSquareTokenized = async (tokenResult: any) => {
    try {
      if (tokenResult.status !== 'OK') {
        throw new Error(tokenResult.errors?.[0]?.message || 'Payment failed');
      }

      const token = tokenResult.token;
      const cardDetails = tokenResult.details?.card;

      console.log('💳 Square payment tokenized successfully:', {
        token: token.substring(0, 20) + '...',
        cardDetails,
        registrationType,
      });

      await processPayment(token, cardDetails);
    } catch (error) {
      console.error('Square tokenization error:', error);
      throw error;
    }
  };

  // Handle Clover token/card details
  const handleCloverToken = async (token: string, cardInfo: any) => {
    try {
      console.log('💳 Clover payment token received:', {
        token: token.substring(0, 20) + '...',
        cardInfo,
      });

      await processPayment(token, cardInfo);
    } catch (error) {
      console.error('Clover payment error:', error);
      throw error;
    }
  };

  const handlePaymentSubmit = async () => {
    // Prevent submission if already paying or duplicate detected
    if (isPaying || isSubmittingRef.current || duplicateDetected) {
      console.warn('Payment submission blocked:', {
        isPaying,
        isSubmitting: isSubmittingRef.current,
        duplicateDetected,
      });
      return;
    }

    setPaymentError(null);

    if (!localCustomerEmail) {
      setPaymentError('Please enter an email address for your receipt');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(localCustomerEmail)) {
      setPaymentError('Please enter a valid email address');
      return;
    }
    if (calculatedAmount <= 0) {
      setPaymentError('Invalid payment amount');
      return;
    }
    if (!paymentSystem) {
      setPaymentError('No active payment system configured');
      return;
    }

    if (paymentSystem === 'square' && paymentFormRef.current) {
      try {
        const result = await paymentFormRef.current.tokenize();
        await handleSquareTokenized(result);
      } catch (error: any) {
        if (!isSubmittingRef.current) {
          setPaymentError(error.message || 'Payment failed');
          if (onPaymentError) onPaymentError(error.message);
        }
      }
    }
  };

  const getTotalAmount = () => {
    return calculatedAmount / 100;
  };

  const getPerRegistrationAmount = () => {
    if (registrationType === 'tournament') {
      return (
        tournamentConfig?.tournamentFee || formConfig?.pricing.basePrice || 425
      );
    }

    if (selectedPackage) {
      return selectedPackage.price;
    }
    return formConfig?.pricing.basePrice || 0;
  };

  // Render the appropriate payment form
  const renderPaymentForm = () => {
    if (loadingConfig) {
      return (
        <div className='text-center py-3'>
          <div className='spinner-border spinner-border-sm text-primary me-2'></div>
          Loading payment configuration...
        </div>
      );
    }

    if (!paymentSystem) {
      return (
        <div className='alert alert-danger'>
          <i className='ti ti-alert-triangle me-2'></i>
          Payment system is not configured. Please contact administrator.
        </div>
      );
    }

    if (paymentSystem === 'square') {
      const appId = paymentConfig?.squareConfig?.applicationId || '';
      const locationId = paymentConfig?.squareConfig?.locationId || '';
      const currency = paymentConfig?.settings?.currency || 'USD';

      if (!appId || !locationId) {
        return (
          <div className='alert alert-warning'>
            <i className='ti ti-alert-triangle me-2'></i>
            Square payment configuration is incomplete. Please configure Square
            in the admin panel.
          </div>
        );
      }

      return (
        <div
          className='payment-form-container'
          style={{ position: 'relative' }}
        >
          {(isPaying || duplicateDetected) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                background: 'rgba(255,255,255,0.6)',
                cursor: 'not-allowed',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className='spinner-border spinner-border-sm text-primary' />
            </div>
          )}
          <PaymentForm
            applicationId={appId}
            locationId={locationId}
            cardTokenizeResponseReceived={handleSquareTokenized}
            createPaymentRequest={() => ({
              countryCode: 'US',
              currencyCode: currency,
              total: {
                amount: (calculatedAmount / 100).toString(),
                label: 'Total',
              },
              buyerEmailAddress: localCustomerEmail,
            })}
            ref={paymentFormRef}
          >
            <CreditCard />
          </PaymentForm>
        </div>
      );
    } else if (paymentSystem === 'clover') {
      const merchantId = paymentConfig?.cloverConfig?.merchantId;
      const cloverEnvironment: 'sandbox' | 'production' =
        paymentConfig?.cloverConfig?.environment === 'sandbox'
          ? 'sandbox'
          : 'production';

      if (!merchantId) {
        return (
          <div className='alert alert-warning'>
            <i className='ti ti-alert-triangle me-2'></i>
            Clover payment configuration is incomplete. Please configure Clover
            in the admin panel.
          </div>
        );
      }

      return (
        <CloverPaymentForm
          merchantId={merchantId}
          onTokenReceived={handleCloverToken}
          amount={calculatedAmount / 100}
          email={localCustomerEmail}
          disabled={disabled || isPaying || duplicateDetected}
          environment={cloverEnvironment}
        />
      );
    } else {
      return (
        <div className='alert alert-warning'>
          <i className='ti ti-alert-triangle me-2'></i>
          Unsupported payment system: {paymentSystem}
        </div>
      );
    }
  };

  // Render payment details
  const renderPaymentDetails = () => {
    if (registrationType === 'tournament') {
      if (effectiveTeams.length === 0) {
        return (
          <div className='alert alert-warning'>
            <i className='ti ti-alert-triangle me-2'></i>
            <strong>No teams found for tournament registration.</strong> Please
            go back and create teams to register.
          </div>
        );
      }

      return (
        <div className='alert alert-info'>
          <h6>Tournament Registration</h6>
          {effectiveTeams.map((team, index) => (
            <div key={index} className='mb-2'>
              <p className='mb-1'>
                <strong>Team {index + 1}:</strong> {team.name}
              </p>
              <p className='mb-1'>
                <strong>Grade:</strong> {team.grade} •{' '}
                <strong>Division:</strong> {team.levelOfCompetition}
              </p>
              <p className='mb-0'>
                <strong>Tournament:</strong> {team.tournament}{' '}
                {team.registrationYear}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (effectivePlayers.length === 0) {
      return (
        <div className='alert alert-warning'>
          <i className='ti ti-alert-triangle me-2'></i>
          <strong>No players found for registration.</strong> Please go back and
          select players to register.
        </div>
      );
    }

    return null;
  };

  const getRegistrationDescription = () => {
    switch (registrationType) {
      case 'tournament':
        return `Tournament Team Registration`;
      case 'tryout':
        return `Tryout Registration`;
      case 'training':
        return `Training Registration`;
      default:
        return `Player Registration`;
    }
  };

  const getPaymentSystemBadge = () => {
    if (!paymentSystem) return 'secondary';

    switch (paymentSystem) {
      case 'square':
        return 'primary';
      case 'clover':
        return 'success';
      case 'stripe':
        return 'info';
      case 'paypal':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-credit-card fs-16' />
          </span>
          <h4 className='text-dark'>{getRegistrationDescription()}</h4>
          {paymentSystem && (
            <span className={`badge bg-${getPaymentSystemBadge()} ms-2`}>
              {paymentSystem.charAt(0).toUpperCase() + paymentSystem.slice(1)}
            </span>
          )}
          {paymentSystem === 'square' &&
            paymentConfig?.squareConfig?.environment === 'sandbox' && (
              <span className='badge bg-warning ms-2'>Sandbox Mode</span>
            )}
          {paymentSystem === 'clover' &&
            paymentConfig?.cloverConfig?.environment === 'sandbox' && (
              <span className='badge bg-warning ms-2'>Sandbox Mode</span>
            )}
          {duplicateDetected && (
            <span className='badge bg-success ms-2'>
              <i className='ti ti-check me-1'></i>
              Already Paid
            </span>
          )}
        </div>
      </div>
      <div className='card-body'>
        {paymentError && (
          <div className='alert alert-danger mb-4'>
            <i className='ti ti-alert-triangle me-2'></i>
            <strong>Payment Error:</strong> {paymentError}
          </div>
        )}

        {duplicateDetected && (
          <div className='alert alert-success mb-4'>
            <i className='ti ti-check-circle me-2'></i>
            <strong>Payment Already Processed:</strong> This payment was already
            completed successfully. No further action is needed.
          </div>
        )}

        {disabled && (
          <div className='alert alert-warning mb-4'>
            <i className='ti ti-lock me-2'></i>
            Please complete all required information to continue with payment.
          </div>
        )}

        <div className='row'>
          <div className='col-12 mb-4'>
            <h5 className='mb-3'>Payment Summary</h5>
            <div className='card bg-light'>
              <div className='card-body'>
                <p className='h5 mb-1'>
                  <strong>Description:</strong> {description}
                </p>
                <p className='h4 mb-1'>
                  <strong>Total Amount:</strong> ${getTotalAmount().toFixed(2)}{' '}
                  {paymentConfig?.settings?.currency || 'USD'}
                </p>
                {registrationType === 'tournament' ? (
                  <p className='text-muted mb-0'>
                    For {effectiveTeams.length} team
                    {effectiveTeams.length !== 1 ? 's' : ''}
                    {` at $${getPerRegistrationAmount().toFixed(2)} per team`}
                  </p>
                ) : (
                  <p className='text-muted mb-0'>
                    For {getEffectiveRegistrationCount()} player
                    {getEffectiveRegistrationCount() !== 1 ? 's' : ''}
                    {selectedPackage ? ` (${selectedPackage.name})` : ''}
                    {` at $${getPerRegistrationAmount().toFixed(2)} per player`}
                  </p>
                )}
                {getEffectiveRegistrationCount() === 0 && (
                  <p className='text-warning mb-0'>
                    No {registrationType === 'tournament' ? 'teams' : 'players'}{' '}
                    selected for registration
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {renderPaymentDetails()}

        <div className='mb-3'>
          <label className='form-label'>Email for Receipt</label>
          <input
            type='email'
            className={`form-control ${!localCustomerEmail ? 'is-invalid' : ''}`}
            value={localCustomerEmail}
            onChange={(e) =>
              setLocalCustomerEmail(e.target.value.toLowerCase())
            }
            required
            disabled={disabled || isPaying || duplicateDetected}
            placeholder='Enter email for payment receipt'
          />
          {!localCustomerEmail && (
            <div className='text-danger small mt-1'>
              Email is required for your receipt
            </div>
          )}
        </div>

        {renderPaymentForm()}

        <div className='mt-4 p-3 bg-light rounded small'>
          <i className='ti ti-shield-check me-2 text-success'></i>
          <strong>Secure Payment:</strong> Your payment information is encrypted
          and processed securely by{' '}
          {paymentSystem.charAt(0).toUpperCase() + paymentSystem.slice(1)}.
          {paymentSystem === 'square' &&
            paymentConfig?.squareConfig?.environment === 'sandbox' && (
              <span className='text-warning ms-1'>
                <i className='ti ti-test-pipe me-1'></i>
                <strong>Sandbox Mode:</strong> Using test credentials.
              </span>
            )}
          {paymentSystem === 'clover' &&
            paymentConfig?.cloverConfig?.environment === 'sandbox' && (
              <span className='text-warning ms-1'>
                <i className='ti ti-test-pipe me-1'></i>
                <strong>Sandbox Mode:</strong> Using test credentials.
              </span>
            )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModule;
