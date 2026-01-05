import { normalizeEmail } from '../email';

describe('normalizeEmail', () => {
  it('should convert email to lowercase', () => {
    expect(normalizeEmail('User@Example.Com')).toBe('user@example.com');
  });

  it('should trim whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('should remove dots from Gmail addresses', () => {
    expect(normalizeEmail('user.name@gmail.com')).toBe('username@gmail.com');
    expect(normalizeEmail('u.s.e.r@gmail.com')).toBe('user@gmail.com');
    expect(normalizeEmail('user.name@googlemail.com')).toBe('username@googlemail.com');
  });

  it('should remove plus addressing', () => {
    expect(normalizeEmail('user+tag@example.com')).toBe('user@example.com');
    expect(normalizeEmail('user+newsletter@gmail.com')).toBe('user@gmail.com');
  });

  it('should handle both Gmail dot removal and plus addressing', () => {
    expect(normalizeEmail('user.name+tag@gmail.com')).toBe('username@gmail.com');
  });

  it('should not remove dots from non-Gmail addresses', () => {
    expect(normalizeEmail('user.name@example.com')).toBe('user.name@example.com');
    expect(normalizeEmail('first.last@company.org')).toBe('first.last@company.org');
  });

  it('should handle invalid emails gracefully', () => {
    expect(normalizeEmail('notanemail')).toBe('notanemail');
    expect(normalizeEmail('@example.com')).toBe('@example.com');
  });

  it('should handle complex real-world examples', () => {
    // These should all normalize to the same email
    const emails = [
      'john.doe@gmail.com',
      'johndoe@gmail.com',
      'John.Doe@gmail.com',
      'john.doe+work@gmail.com',
      'JohnDoe+newsletter@Gmail.Com',
      '  john.doe@gmail.com  ',
    ];

    const normalized = emails.map(normalizeEmail);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe('johndoe@gmail.com');
  });
});
