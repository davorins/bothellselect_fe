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

  // Payment configuration state
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigType | null>(
    null,
  );
  const [paymentSystem, setPaymentSystem] = useState<PaymentSystem>('square');
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Refs to track previous values and prevent infinite loops
  const prevPlayersRef = useRef<any[]>();
  const prevFormDataPlayersRef = useRef<any[]>();

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

          // Create a PaymentConfiguration object from the response
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
            squareConfig: response.data.squareConfig,
            cloverConfig: response.data.cloverConfig,
          });

          // Validate Square configuration
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
      savedPlayersCount: savedPlayers?.length || 0,
      playersProp: players,
      formDataPlayers: formData?.players,
      savedPlayers: savedPlayers,
      eventData,
    });

    if (registrationType === 'tournament') {
      return [];
    }

    let playersToReturn: any[] = [];

    // For tryout, check all possible sources and DON'T filter by payment status
    if (registrationType === 'tryout') {
      // 1. Check players prop (from parent)
      if (players && players.length > 0) {
        console.log('✅ Using players prop for tryout:', players);
        playersToReturn = players;
      }
      // 2. Check formData.players
      else if (formData?.players && formData.players.length > 0) {
        console.log('✅ Using formData.players for tryout:', formData.players);
        playersToReturn = formData.players;
      }
      // 3. Check savedPlayers prop
      else if (savedPlayers && savedPlayers.length > 0) {
        console.log('✅ Using savedPlayers for tryout:', savedPlayers);
        playersToReturn = savedPlayers;
      }
      // 4. Check formData.formData?.players (nested)
      else if (
        formData?.formData?.players &&
        formData.formData.players.length > 0
      ) {
        console.log(
          '✅ Using nested formData.formData.players:',
          formData.formData.players,
        );
        playersToReturn = formData.formData.players;
      }

      // For tryout, return ALL players - don't filter by payment status
      console.log('Tryout - returning all players:', {
        count: playersToReturn.length,
        players: playersToReturn.map((p: any) => ({
          id: p._id,
          name: p.fullName,
        })),
      });
      return playersToReturn;
    }

    // For other registration types, filter for unpaid players
    if (players && players.length > 0) {
      playersToReturn = players;
    } else if (formData?.players && formData.players.length > 0) {
      playersToReturn = formData.players;
    } else if (savedPlayers && savedPlayers.length > 0) {
      playersToReturn = savedPlayers;
    }

    // Filter for unpaid players
    const unpaidPlayers = playersToReturn.filter(
      (player: Player) =>
        !player.paymentComplete || player.paymentStatus !== 'paid',
    );

    console.log('Filtered players:', {
      total: playersToReturn.length,
      unpaid: unpaidPlayers.length,
      players: unpaidPlayers.map((p: any) => ({ id: p._id, name: p.fullName })),
    });

    return unpaidPlayers;
  }, [players, formData, registrationType, eventData, savedPlayers, user]);

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
      effectivePlayers: effectivePlayers.map((p) => ({
        id: p._id,
        name: p.fullName,
        paymentStatus: p.paymentStatus,
        paymentComplete: p.paymentComplete,
        seasons: p.seasons?.map((s: any) => ({
          season: s.season,
          year: s.year,
          tryoutId: s.tryoutId,
          paymentStatus: s.paymentStatus,
        })),
      })),
    });

    if (registrationType === 'tournament') {
      return effectiveTeams.length;
    }

    if (registrationType === 'training') {
      return effectivePlayers.length;
    }

    if (registrationType === 'tryout') {
      // For tryout, count ALL players regardless of payment status
      // This allows parents to pay for tryouts even if they were previously marked as paid
      console.log('Tryout - counting all players:', effectivePlayers.length);
      return effectivePlayers.length;
    }

    // Default player registration - filter for unpaid players
    const unpaidPlayers = effectivePlayers.filter(
      (player: Player) =>
        !player.paymentComplete || player.paymentStatus !== 'paid',
    );

    console.log('Filtered players:', {
      total: effectivePlayers.length,
      unpaid: unpaidPlayers.length,
    });

    return unpaidPlayers.length;
  }, [
    registrationType,
    effectiveTeams,
    effectivePlayers,
    eventData,
    effectiveEventData,
    formData,
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
    eventData,
  ]);

  // Unified payment processing function
  const processPayment = async (token: string, cardDetails: any) => {
    try {
      setIsPaying(true);
      setPaymentError(null);

      // Get token BEFORE making the request
      const tokenAuth = localStorage.getItem('token');
      if (!tokenAuth) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Get active payment system from state
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
        // Players with proper typing
        players: effectivePlayers.map((p: Player) => ({
          playerId: p._id,
          season: effectiveEventData?.season || 'Tryout',
          year: effectiveEventData?.year || new Date().getFullYear(),
          tryoutId: effectiveEventData?.eventId,
        })),
        // Nested cardDetails (for tryout validation)
        cardDetails: {
          last_4: last4,
          card_brand: brand,
          exp_month: parseInt(expMonth),
          exp_year: parseInt(expYear),
        },
        // Flattened fields (for paymentProcessRoutes validation)
        cardExpYear: parseInt(expYear),
        cardExpMonth: parseInt(expMonth),
        cardLastFour: last4,
        cardBrand: brand,
        paymentSystem: activeSystem,
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
        const successData = {
          success: true,
          paymentId: response.data.paymentId,
          paymentSystem: response.data.paymentSystem || activeSystem,
          externalPaymentId: response.data.paymentId,
          receiptUrl: response.data.receiptUrl,
          players: response.data.players || [],
          teams: response.data.teams || [],
          amount: paymentData.amount,
          email: localCustomerEmail,
          playerCount: paymentData.players?.length || 0,
          teamCount: paymentData.teamIds?.length || 0,
          totalAmount: paymentData.amount / 100,
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
        errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `Server error: ${error.response.status}`;

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
    try {
      setIsPaying(true);
      setPaymentError(null);

      // Basic validation
      if (!localCustomerEmail) {
        throw new Error('Please enter an email address for your receipt');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(localCustomerEmail)) {
        throw new Error('Please enter a valid email address');
      }

      if (calculatedAmount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Get active payment system from state (CHANGED: use state instead of API call)
      const activeSystem = paymentSystem;

      if (!activeSystem) {
        throw new Error('No active payment system configured');
      }

      // For Square, trigger form submission
      if (activeSystem === 'square' && paymentFormRef.current) {
        const result = await paymentFormRef.current.tokenize();
        await handleSquareTokenized(result);
      }
      // For Clover, the form handles submission internally via handleCloverToken
      else if (activeSystem === 'clover') {
        // Clover form submits directly, no need to do anything here
        // The CloverPaymentForm component will call handleCloverToken
      } else {
        throw new Error(`Unsupported payment system: ${activeSystem}`);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Payment processing failed';
      console.error('❌ Payment submission error:', errorMsg);
      setPaymentError(errorMsg);
      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
    } finally {
      setIsPaying(false);
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
          className={`payment-form-container ${disabled ? 'opacity-50' : ''}`}
        >
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
          disabled={disabled || isPaying}
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
        </div>
      </div>
      <div className='card-body'>
        {paymentError && (
          <div className='alert alert-danger mb-4'>
            <i className='ti ti-alert-triangle me-2'></i>
            <strong>Payment Error:</strong> {paymentError}
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
            <h5 className='text-primary mb-3'>Payment Summary</h5>
            <div className='card bg-light'>
              <div className='card-body'>
                <p className='h5 mb-1'>
                  <strong>Description:</strong>{' '}
                  <span className='text-white'>{description}</span>
                </p>
                <p className='h4 mb-1'>
                  <strong>Total Amount:</strong>{' '}
                  <span className='text-white'>
                    ${getTotalAmount().toFixed(2)}{' '}
                    {paymentConfig?.settings?.currency || 'USD'}
                  </span>
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
            disabled={disabled || isPaying}
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
          <strong>Secure Payment:</strong>{' '}
          <span className='text-white'>
            Your payment information is encrypted and processed securely by{' '}
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
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentModule;
