import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  previewText: string;
  code: number;
};

export default function RequestOtpTemplate({ previewText, code }: Props) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body>
        <Container className="w-full max-w-[500px]">
          <Section style={{ ...sectionStyle, width: "fit-content" }}>
            <Img
              alt="45Group Logo"
              className="rounded-[12px] [margin:12px_auto_12px]"
              height={150}
              src={`/assets/logo.png`}
            />
          </Section>
          <Section style={sectionStyle}>
            <Text>Verify your email address</Text>
          </Section>
          <Section style={sectionStyle}>
            <Text>To authenticate, please use the following One Time Password (OTP):</Text>
          </Section>
          <Section className="" style={sectionStyle}>
            <Text className="text-center">{code}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const sectionStyle = {
  margin: "8px 0",
};
