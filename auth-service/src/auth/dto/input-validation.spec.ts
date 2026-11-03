import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterInput } from './register.input';
import { LoginInput } from './login.input';

describe('DTO & Email Format Validation', () => {
  describe('RegisterInput', () => {
    it('should pass validation when email and password are valid', async () => {
      const input = plainToInstance(RegisterInput, {
        email: 'fajar@test.com',
        password: 'SecurePassword123!',
      });

      const errors = await validate(input);
      expect(errors.length).toBe(0);
    });

    it.each([
      'notanemail',
      'user@',
      '@domain.com',
      'user@domain',
      'user@.com',
      'user..name@domain.com',
    ])('should fail validation when email is invalid format: "%s"', async (invalidEmail) => {
      const input = plainToInstance(RegisterInput, {
        email: invalidEmail,
        password: 'ValidPassword123!',
      });

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints).toHaveProperty('isEmail');
    });

    it('should fail validation when email is empty', async () => {
      const input = plainToInstance(RegisterInput, {
        email: '',
        password: 'ValidPassword123!',
      });

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('should fail validation when password is shorter than 6 characters', async () => {
      const input = plainToInstance(RegisterInput, {
        email: 'teddy@test.com',
        password: '12345',
      });

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints).toHaveProperty('minLength');
    });
  });

  describe('LoginInput', () => {
    it('should pass validation when email and password are provided and valid', async () => {
      const input = plainToInstance(LoginInput, {
        email: 'fajar@test.com',
        password: 'Password123!',
      });

      const errors = await validate(input);
      expect(errors.length).toBe(0);
    });

    it.each([
      'plainaddress',
      'user@domain',
      '@nodomain.com',
    ])('should fail validation when login email has invalid format: "%s"', async (invalidEmail) => {
      const input = plainToInstance(LoginInput, {
        email: invalidEmail,
        password: 'Password123!',
      });

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints).toHaveProperty('isEmail');
    });

    it('should fail validation when login password is missing or empty', async () => {
      const input = plainToInstance(LoginInput, {
        email: 'teddy@test.com',
        password: '',
      });

      const errors = await validate(input);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints).toHaveProperty('isNotEmpty');
    });
  });
});
