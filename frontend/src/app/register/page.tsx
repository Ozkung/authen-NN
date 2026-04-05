"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Input,
  Button,
  Link,
  TextField,
  Label,
  Select,
  ListBox,
  DatePicker,
  DateField,
  Calendar,
  FieldError,
  Checkbox,
  Description,
} from "@heroui/react";
import { DateValue } from "@internationalized/date";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState<DateValue | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const showPasswordError = confirmPassword.length > 0 && !passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      setMessage("Passwords do not match");
      return;
    }

    if (!isAccepted) {
      setMessage("You must accept the terms and privacy policy");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const res = await fetch("http://localhost:3001/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        displayName,
        gender,
        birthDate: birthDate ? birthDate.toString() : undefined,
      }),
    });
    const data = await res.json();
    setIsLoading(false);
    setMessage(data.message || data.error || "Something went wrong");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 bg-gray-50">
      <Card className="w-[450px] shadow-lg">
        <CardHeader className="flex flex-col items-center gap-1 py-6">
          <h1 className="text-2xl font-bold">Register</h1>
          <p className="text-small text-default-500">
            Create an account to get started.
          </p>
        </CardHeader>
        <CardContent className="pb-6 px-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField onChange={setDisplayName} isRequired>
              <Label>Display Name</Label>
              <Input
                type="text"
                placeholder="Enter your display name"
                value={displayName}
              />
            </TextField>

            <TextField onChange={setEmail} isRequired>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
              />
            </TextField>

            <TextField onChange={setPassword} isRequired>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Create a password"
                value={password}
              />
            </TextField>

            <TextField
              onChange={setConfirmPassword}
              isRequired
              isInvalid={showPasswordError}
            >
              <Label>Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
              />
              {showPasswordError && (
                <FieldError>Passwords do not match</FieldError>
              )}
            </TextField>

            <div className="flex gap-4 items-start">
              <Select
                className="w-1/3"
                placeholder="Select gender"
                onSelectionChange={(val) => setGender(val as string)}
                isRequired
              >
                <Label>Gender</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="male" textValue="Male">
                      Male
                    </ListBox.Item>
                    <ListBox.Item id="female" textValue="Female">
                      Female
                    </ListBox.Item>
                    <ListBox.Item id="other" textValue="Other">
                      Other
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              <DatePicker
                className="w-2/3"
                isRequired
                value={birthDate}
                onChange={setBirthDate}
              >
                <Label>Birth Date</Label>
                <DateField.Group fullWidth>
                  <DateField.Input>
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                  <DateField.Suffix>
                    <DatePicker.Trigger>
                      <DatePicker.TriggerIndicator />
                    </DatePicker.Trigger>
                  </DateField.Suffix>
                </DateField.Group>
                <DatePicker.Popover>
                  <Calendar aria-label="Birth date">
                    <Calendar.Header>
                      <Calendar.YearPickerTrigger>
                        <Calendar.YearPickerTriggerHeading />
                        <Calendar.YearPickerTriggerIndicator />
                      </Calendar.YearPickerTrigger>
                      <Calendar.NavButton slot="previous" />
                      <Calendar.NavButton slot="next" />
                    </Calendar.Header>
                    <Calendar.Grid>
                      <Calendar.GridHeader>
                        {(day) => (
                          <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                        )}
                      </Calendar.GridHeader>
                      <Calendar.GridBody>
                        {(date) => <Calendar.Cell date={date} />}
                      </Calendar.GridBody>
                    </Calendar.Grid>
                    <Calendar.YearPickerGrid>
                      <Calendar.YearPickerGridBody>
                        {({ year }) => <Calendar.YearPickerCell year={year} />}
                      </Calendar.YearPickerGridBody>
                    </Calendar.YearPickerGrid>
                  </Calendar>
                </DatePicker.Popover>
              </DatePicker>
            </div>

            <Checkbox
              name="agreement"
              isSelected={isAccepted}
              onChange={setIsAccepted}
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label htmlFor="agreement">I agree to the terms</Label>
                <Description>You must accept the terms to continue</Description>
              </Checkbox.Content>
            </Checkbox>

            <Button
              type="submit"
              variant="primary"
              isPending={isLoading}
              className="mt-4 w-full"
              isDisabled={showPasswordError || !isAccepted}
            >
              Register
            </Button>
          </form>
          {message && (
            <p
              className={`mt-4 text-center text-small ${
                message.includes("error") ||
                message.includes("wrong") ||
                message.includes("exists") ||
                message.includes("match") ||
                message.includes("accept")
                  ? "text-danger"
                  : "text-primary"
              }`}
            >
              {message}
            </p>
          )}
          <p className="mt-6 text-center text-small">
            Already have an account? <Link href="/login">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
