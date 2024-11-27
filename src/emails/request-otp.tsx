import { Column, Row, Section, Text } from "@react-email/components";
import { columnStyle, sectionStyle, textStyle } from "./utils";
import BaseTemplate from "./base";

type Props = {
  previewText: string;
  code: string;
};

export default function RequestOtpTemplate({ previewText, code }: Props) {
  return (
    <BaseTemplate previewText={previewText}>
      <Section style={{ ...sectionStyle, margin: "12px 0px" }}>
        <Row>
          <Column
            style={{
              ...columnStyle,
            }}
          >
            <Text style={{ ...textStyle, fontWeight: 500, fontSize: "18px" }}>
              Verify your email address
            </Text>
          </Column>
        </Row>
      </Section>
      <Section style={sectionStyle}>
        <Row>
          <Column
            style={{
              ...columnStyle,
            }}
          >
            <Text style={{ ...textStyle }}>
              To authenticate, please use the following One Time Password (OTP):
            </Text>
          </Column>
        </Row>
      </Section>
      <Section style={{ ...sectionStyle }}>
        <Text style={{ ...textStyle, fontWeight: 600, fontSize: "24px", textAlign: "center" }}>
          {code}
        </Text>
      </Section>
      <Section style={{ ...sectionStyle }}>
        <Row>
          <Column
            style={{
              ...columnStyle,
            }}
          >
            <Text style={{ ...textStyle }}>
              Please do not share this OTP with anyone. At 45Group, we take your account security
              very seriously. Our Support Team will never ask you to disclose or verify your
              password, OTP and other personal information. If you did not initiate this request,
              please contact our support team immediately.
            </Text>
          </Column>
        </Row>
      </Section>
    </BaseTemplate>
  );
}
