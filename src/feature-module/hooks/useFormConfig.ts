// useFormConfig.ts
import { useState, useEffect } from 'react';
import { RegistrationFormConfig } from '../../types/registration-types';

export const useFormConfig = (
  season: string,
  year: number,
  registrationType?: string
) => {
  const [formConfig, setFormConfig] = useState<
    RegistrationFormConfig | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 Fetching form config for:', {
          season,
          year,
          registrationType,
        });

        const response = await fetch(
          `${
            process.env.REACT_APP_API_BASE_URL
          }/admin/form-config?season=${encodeURIComponent(season)}&year=${year}`
        );

        if (response.ok) {
          const config = await response.json();
          console.log('✅ Form config loaded from API:', {
            config,
            packages: config.pricing?.packages,
            packagesCount: config.pricing?.packages?.length || 0,
          });

          // Check if config is actually an error object
          if (config && config.error) {
            console.log('📭 API returned error:', config.error);
            setFormConfig(undefined);
          } else if (config) {
            const processedConfig: RegistrationFormConfig = {
              isActive: config.isActive || false,
              requiresPayment: config.requiresPayment || false,
              requiresQualification: config.requiresQualification || false,
              pricing: {
                basePrice: config.pricing?.basePrice || 0,
                packages: (config.pricing?.packages || []).map(
                  (pkg: any, index: number) => ({
                    id:
                      pkg.id ||
                      pkg._id?.toString() ||
                      `pkg-${Date.now()}-${index}`,
                    name: pkg.name || '',
                    price: pkg.price || 0,
                    description: pkg.description || '',
                  })
                ),
              },
            };

            console.log('🔄 Processed config for frontend:', {
              ...processedConfig,
              packagesCount: processedConfig.pricing.packages.length,
              packages: processedConfig.pricing.packages,
            });

            setFormConfig(processedConfig);
          } else {
            console.log('📭 No config data returned');
            setFormConfig(undefined);
          }
        } else if (response.status === 404) {
          console.log('📭 No form config found (404)');
          setFormConfig(undefined);
        } else {
          const errorText = await response.text();
          console.error('❌ API error response:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
          });
          throw new Error(
            `Failed to fetch form config: ${response.status} - ${response.statusText}`
          );
        }
      } catch (err) {
        console.error('❌ Error fetching form config:', err);
        setError('Failed to load form configuration');
        setFormConfig(undefined);
      } finally {
        setIsLoading(false);
      }
    };

    if (season && year) {
      fetchFormConfig();
    } else {
      console.warn('⚠️ Missing season or year:', { season, year });
      setIsLoading(false);
    }
  }, [season, year, registrationType]);

  return { formConfig, isLoading, error };
};
