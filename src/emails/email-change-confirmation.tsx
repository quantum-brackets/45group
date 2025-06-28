import { Column, Row, Section, Text } from "@react-email/components";
import { columnStyle, sectionStyle, textStyle } from "./utils";
import BaseTemplate from "./base";

type Props = {
  previewText: string;
};

export default function EmailChangeConfirmation({ previewText }: Props) {
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
              Your email address has been updated successfully!
            </Text>
          </Column>
        </Row>
      </Section>
      <Section style={{ ...sectionStyle }}>
        <Row>
          <Column
            style={{
              ...columnStyle,
            }}
          >
            <Text style={{ ...textStyle }}>
              {
                "We're excited to have you join our platform where you can discover and book the finest lodges, events, and cuisines. Your account is now active and ready to use, simply log in to start exploring our exclusive offerings and make your first booking."
              }
            </Text>
          </Column>
        </Row>
      </Section>
    </BaseTemplate>
  );
}
